/**
 * WS-09 credential-material scan (DEVREQ-EVT-20260809-001, GATE-SECURITY).
 *
 * Scans every git-tracked file at the current revision, and every line added
 * across the whole reachable git history, against 27 credential and personal-data
 * patterns. Prints a table and writes `tests/.results/secret-scan.json`.
 *
 *   node tests/security/secret-scan.mjs
 *
 * It is a measurement harness, not a test: every match is PRINTED WITH ITS
 * LOCATION so a reader can judge it, rather than being asserted away. Matched
 * text is truncated to 90 characters. If this scan ever does find real
 * credential material, the value must NOT be pasted into a review document —
 * `config/operating-model.yaml` guardrail `secret_values_allowed_in_repository`
 * is false, and a finding is reported by location and pattern name only.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const RESULTS = join(ROOT, 'tests', '.results');

const git = (...args) => execFileSync('git', args, { cwd: ROOT, maxBuffer: 256 * 1024 * 1024 }).toString();

/** [name, pattern, what a hit means]. Order is stable so diffs are readable. */
const RULES = [
  ['aws_access_key_id', /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g],
  ['aws_secret_key_assign', /aws_secret_access_key\s*[=:]\s*['"][^'"]{20,}['"]/gi],
  ['github_token', /\bgh[pousr]_[A-Za-z0-9]{16,}\b/g],
  ['github_pat_fine_grained', /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g],
  ['slack_token', /\bxox[abposr]-[A-Za-z0-9-]{10,}\b/g],
  ['stripe_key', /\b[sr]k_(?:live|test)_[A-Za-z0-9]{16,}\b/g],
  ['google_api_key', /\bAIza[0-9A-Za-z_-]{35}\b/g],
  ['openai_key', /\bsk-[A-Za-z0-9]{20,}\b/g],
  ['anthropic_key', /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g],
  ['npm_token', /\bnpm_[A-Za-z0-9]{36}\b/g],
  ['json_web_token', /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['private_key_block', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP |ENCRYPTED )?PRIVATE KEY-----/g],
  ['ssh_public_key', /\bssh-(?:rsa|ed25519|dss)\s+AAAA[0-9A-Za-z+/=]{20,}/g],
  ['pem_certificate', /-----BEGIN CERTIFICATE-----/g],
  ['putty_key_file', /PuTTY-User-Key-File/g],
  ['basic_auth_in_url', /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@[^\s'"`]+/gi],
  ['database_connection_string', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp|mssql):\/\/[^\s'"`]+/gi],
  ['password_assignment', /\b(?:password|passwd|pwd|passphrase)\s*[=:]\s*['"][^'"\s]{4,}['"]/gi],
  ['secret_assignment', /\b(?:secret|client_secret|api_?key|apikey|access_?token|auth_?token|bearer_?token|session_?secret|private_?key|encryption_?key)\s*[=:]\s*['"][^'"\s]{8,}['"]/gi],
  ['authorization_header', /\bAuthorization\s*[=:]\s*['"]?(?:Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi],
  ['env_secret_line', /^\s*(?:export\s+)?[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|APIKEY|API_KEY|PRIVATE_KEY|CREDENTIAL)[A-Z0-9_]*\s*=\s*\S+/gm],
  ['high_entropy_base64_literal', /['"][A-Za-z0-9+/]{40,}={0,2}['"]/g],
  ['telephone_number', /\b\+?\d{1,3}[-. ]?\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}\b/g],
  ['email_address', /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g],
  ['ipv4_literal', /\b(?!0\.|127\.|255\.255)(?:\d{1,3}\.){3}\d{1,3}\b/g],
  ['remote_url', /\bhttps?:\/\/(?!localhost|127\.0\.0\.1)[^\s'"`)<>]+/gi],
  ['dotenv_or_key_path', /(?:^|[/\\])(?:\.env(?:\.\w+)?|id_rsa|id_ed25519|\.netrc|\.npmrc|[^\s/\\]+\.(?:pem|key|p12|pfx|jks|keystore))$/gim]
];

const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.pdf', '.zip', '.webp', '.mp3', '.mp4']);

const tracked = git('ls-files').trim().split('\n').filter(Boolean);
const findings = [];
let scanned = 0;
let skipped = 0;

for (const relPath of tracked) {
  const absolute = join(ROOT, relPath);
  if (!existsSync(absolute)) continue;
  if (BINARY_EXT.has(extname(relPath).toLowerCase())) {
    skipped += 1;
    continue;
  }
  const text = readFileSync(absolute, 'utf8');
  scanned += 1;
  for (const [name, pattern] of RULES) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      findings.push({
        rule: name,
        file: relPath,
        line: text.slice(0, match.index).split('\n').length,
        match: match[0].slice(0, 90)
      });
    }
  }
}

// every line ever ADDED anywhere in the reachable history
const history = git('log', '-p', '--all', '--no-color', '--unified=0');
const addedLines = history.split('\n').filter((line) => line.startsWith('+') && !line.startsWith('+++'));
const historyFindings = [];
for (const [name, pattern] of RULES) {
  if (name === 'remote_url' || name === 'ipv4_literal' || name === 'dotenv_or_key_path' || name === 'email_address') continue;
  for (const line of addedLines) {
    pattern.lastIndex = 0;
    const match = line.match(pattern);
    if (match) historyFindings.push({ rule: name, match: match[0].slice(0, 90) });
  }
}

const everTracked = [...new Set(git('log', '--all', '--pretty=format:', '--name-only').split('\n').map((s) => s.trim()).filter(Boolean))];
const sensitivePaths = everTracked.filter((p) => /(^|\/)(\.env(\.\w+)?|secrets?|credentials?|id_rsa|id_ed25519|\.netrc|\.npmrc)($|\/)|\.(pem|key|p12|pfx|jks|keystore)$/i.test(p));

const byRule = new Map(RULES.map(([name]) => [name, []]));
for (const finding of findings) byRule.get(finding.rule).push(finding);

console.log(`repository            : ${ROOT}`);
console.log(`revision              : ${git('rev-parse', 'HEAD').trim()}`);
console.log(`tracked files         : ${tracked.length}`);
console.log(`text files scanned    : ${scanned}`);
console.log(`binary files skipped  : ${skipped}`);
console.log(`patterns applied      : ${RULES.length}`);
console.log(`commits in history    : ${git('rev-list', '--count', '--all').trim()}`);
console.log(`added lines in history: ${addedLines.length}`);
console.log(`paths ever tracked    : ${everTracked.length}`);
console.log('');
for (const [name] of RULES) {
  const hits = byRule.get(name);
  console.log(`  ${name.padEnd(30)} matches=${String(hits.length).padStart(3)}`);
  for (const hit of hits.slice(0, 15)) console.log(`      ${hit.file}:${hit.line}: ${hit.match}`);
  if (hits.length > 15) console.log(`      ... +${hits.length - 15} more`);
}
console.log('');
console.log(`TOTAL matches at HEAD                 : ${findings.length}`);
console.log(`Credential-pattern matches in history : ${historyFindings.length}`);
console.log(`Sensitive paths ever tracked          : ${sensitivePaths.length}${sensitivePaths.length ? ` ${JSON.stringify(sensitivePaths)}` : ''}`);
console.log(`.gitignore present                    : ${existsSync(join(ROOT, '.gitignore'))}`);
console.log(`node_modules present                  : ${existsSync(join(ROOT, 'node_modules'))}`);

const report = {
  producedBy: 'tests/security/secret-scan.mjs',
  workstream: 'WS-09',
  request: 'DEVREQ-EVT-20260809-001',
  capturedAt: new Date().toISOString(),
  revision: git('rev-parse', 'HEAD').trim(),
  node: process.version,
  trackedFiles: tracked.length,
  textFilesScanned: scanned,
  binaryFilesSkipped: skipped,
  patternsApplied: RULES.map(([name]) => name),
  commitsScanned: Number(git('rev-list', '--count', '--all').trim()),
  addedLinesScanned: addedLines.length,
  matchesAtHead: findings,
  credentialMatchesInHistory: historyFindings,
  sensitivePathsEverTracked: sensitivePaths,
  gitignorePresent: existsSync(join(ROOT, '.gitignore')),
  nodeModulesPresent: existsSync(join(ROOT, 'node_modules'))
};

mkdirSync(RESULTS, { recursive: true });
writeFileSync(join(RESULTS, 'secret-scan.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log('\nwrote tests/.results/secret-scan.json');

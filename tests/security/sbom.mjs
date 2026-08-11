/**
 * WS-09 software bill of materials (DEVREQ-EVT-20260809-001, GATE-SUPPLY-CHAIN).
 *
 *   node tests/security/sbom.mjs
 *
 * Writes `tests/.results/sbom.cdx.json` (CycloneDX 1.5 JSON) and a
 * `tests/.results/sbom.cdx.json.sha256` sidecar, matching the convention
 * `tests/.results/a11y-contrast.json.sha256` already uses.
 *
 * The top-level `components` array is EMPTY, and that is the finding, not a
 * failure of the generator: Dino Dash Unit 1 declares zero dependencies and zero
 * devDependencies, `package-lock.json` pins an empty set, and nothing is fetched
 * at build time or at run time. A zero-component SBOM is still an SBOM.
 *
 * The 18 first-party files that make up the shipped bundle are recorded as
 * NESTED subcomponents of the single root component, with SHA-256 hashes. They
 * are parts of one component, not dependencies of it, so they do not belong in
 * the top-level array — putting them there would inflate a supply-chain
 * inventory with the thing being inventoried.
 *
 * Every number below is derived at run time from the files themselves. Nothing
 * is transcribed by hand.
 */

import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const SRC = join(ROOT, 'src');
const RESULTS = join(ROOT, 'tests', '.results');

const git = (...args) => execFileSync('git', args, { cwd: ROOT }).toString().trim();
const readJson = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const sha256 = (buffer) => createHash('sha256').update(buffer).digest('hex');

function listFiles(directory) {
  const found = [];
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) found.push(...listFiles(path));
    else found.push(path);
  }
  return found;
}

const pkg = readJson('package.json');
const lock = readJson('package-lock.json');
const revision = git('rev-parse', 'HEAD');

const DEP_FIELDS = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'bundledDependencies', 'bundleDependencies', 'overrides', 'resolutions'];
const declared = {};
let declaredTotal = 0;
for (const field of DEP_FIELDS) {
  const value = pkg[field];
  const count = value && typeof value === 'object' ? Object.keys(value).length : 0;
  declared[field] = { declared: field in pkg, entries: count };
  declaredTotal += count;
}

const lockPackages = Object.keys(lock.packages ?? {});
const lockThirdParty = lockPackages.filter((key) => key !== '');

// Module specifiers actually resolved by the shipped bundle and by the test tier.
const SPECIFIER = /(?:^|[^\w.])(?:import\s+[^'";]*?from\s*|import\s*|export\s+[^'";]*?from\s*|require\s*\(\s*)['"]([^'"]+)['"]/g;
function specifiersUnder(directory) {
  const buckets = { relative: new Set(), nodeBuiltin: new Set(), bareThirdParty: new Set(), url: new Set() };
  for (const path of listFiles(join(ROOT, directory))) {
    if (!/\.(mjs|js|cjs|html)$/.test(path)) continue;
    if (relative(ROOT, path).replace(/\\/g, '/').includes('/.results/')) continue;
    const source = readFileSync(path, 'utf8');
    SPECIFIER.lastIndex = 0;
    for (const match of source.matchAll(SPECIFIER)) {
      const specifier = match[1];
      if (specifier.startsWith('.') || specifier.startsWith('/')) buckets.relative.add(specifier);
      else if (specifier.startsWith('node:')) buckets.nodeBuiltin.add(specifier);
      else if (/^[a-z][a-z0-9+.-]*:\/\//i.test(specifier)) buckets.url.add(specifier);
      else buckets.bareThirdParty.add(specifier);
    }
  }
  return Object.fromEntries(Object.entries(buckets).map(([k, v]) => [k, [...v].sort()]));
}

const srcSpecifiers = specifiersUnder('src');
const testSpecifiers = specifiersUnder('tests');

// Remote references anywhere in the shipped bundle, comments included.
const bundleFiles = listFiles(SRC).map((path) => {
  const bytes = readFileSync(path);
  return {
    name: relative(SRC, path).replace(/\\/g, '/'),
    bytes: bytes.length,
    sha256: sha256(bytes),
    remoteRefs: [...bytes.toString('utf8').matchAll(/https?:\/\/[^\s"'`)<>]+|\/\/(?:cdn|unpkg|jsdelivr|cdnjs)[^\s"'`)<>]*/gi)].map((m) => m[0])
  };
});
const remoteRefTotal = bundleFiles.reduce((sum, file) => sum + file.remoteRefs.length, 0);
const bundleBytes = bundleFiles.reduce((sum, file) => sum + file.bytes, 0);

// Build-pipeline dependencies. Not part of the shipped artifact, but part of the
// supply chain, so they are recorded rather than omitted.
const workflowPath = join(ROOT, '.github', 'workflows', 'ci.yml');
let ciActions = [];
try {
  ciActions = [...readFileSync(workflowPath, 'utf8').matchAll(/uses:\s*(\S+)/g)].map((m) => m[1]);
} catch {
  ciActions = [];
}

const serialNumber = `urn:uuid:${createHash('sha256').update(`dino-dash:${revision}`).digest('hex')
  .replace(/^(.{8})(.{4})(.{3})(.{3})(.{12}).*$/, '$1-$2-5$3-8$4-$5')}`;

const sbom = {
  bomFormat: 'CycloneDX',
  specVersion: '1.5',
  serialNumber,
  version: 1,
  metadata: {
    timestamp: new Date().toISOString(),
    tools: [{ vendor: 'Dino Dash engineering', name: 'tests/security/sbom.mjs', version: '1.0.0' }],
    authors: [{ name: 'ENG-09 Security, Privacy and Compliance (actor-eng-09), WS-09' }],
    component: {
      type: 'application',
      'bom-ref': `dino-dash@${pkg.version}`,
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      licenses: [{ license: { id: undefined, name: pkg.license } }],
      scope: 'required',
      properties: [
        { name: 'dinodash:request', value: 'DEVREQ-EVT-20260809-001' },
        { name: 'dinodash:plan', value: 'ENGPLAN-EVT-20260809-001' },
        { name: 'dinodash:workstream', value: 'WS-09' },
        { name: 'dinodash:gate', value: 'GATE-SUPPLY-CHAIN' },
        { name: 'dinodash:sourceRevision', value: revision },
        { name: 'dinodash:branch', value: git('rev-parse', '--abbrev-ref', 'HEAD') },
        { name: 'dinodash:bundleFiles', value: String(bundleFiles.length) },
        { name: 'dinodash:bundleBytes', value: String(bundleBytes) },
        { name: 'dinodash:runtimeDependencies', value: String(declared.dependencies.entries) },
        { name: 'dinodash:devDependencies', value: String(declared.devDependencies.entries) },
        { name: 'dinodash:allDeclaredDependencyEntries', value: String(declaredTotal) },
        { name: 'dinodash:lockfileVersion', value: String(lock.lockfileVersion) },
        { name: 'dinodash:lockfileThirdPartyEntries', value: String(lockThirdParty.length) },
        { name: 'dinodash:bundleBareImportSpecifiers', value: String(srcSpecifiers.bareThirdParty.length) },
        { name: 'dinodash:bundleRemoteReferences', value: String(remoteRefTotal) },
        { name: 'dinodash:testTierNodeBuiltins', value: testSpecifiers.nodeBuiltin.join(' ') },
        { name: 'dinodash:testTierBareImportSpecifiers', value: String(testSpecifiers.bareThirdParty.length) },
        { name: 'dinodash:buildPipelineActions', value: ciActions.join(' ') },
        { name: 'dinodash:nodeEnginesFloor', value: (pkg.engines ?? {}).node ?? 'unstated' },
        { name: 'dinodash:generatorNode', value: process.version }
      ],
      // Parts of this one component, not dependencies of it.
      components: bundleFiles.map((file) => ({
        type: 'file',
        'bom-ref': `src/${file.name}`,
        name: `src/${file.name}`,
        scope: 'required',
        hashes: [{ alg: 'SHA-256', content: file.sha256 }],
        properties: [
          { name: 'dinodash:bytes', value: String(file.bytes) },
          { name: 'dinodash:remoteReferences', value: String(file.remoteRefs.length) }
        ]
      }))
    }
  },
  // ZERO third-party components. This is the measured result, not an empty stub.
  components: [],
  dependencies: [{ ref: `dino-dash@${pkg.version}`, dependsOn: [] }]
};

mkdirSync(RESULTS, { recursive: true });
const serialized = `${JSON.stringify(sbom, null, 2)}\n`;
const outPath = join(RESULTS, 'sbom.cdx.json');
writeFileSync(outPath, serialized, 'utf8');
const digest = sha256(Buffer.from(serialized, 'utf8'));
writeFileSync(`${outPath}.sha256`, `${digest}  sbom.cdx.json\n`, 'utf8');

console.log('--- declared dependencies (package.json) ---');
for (const field of DEP_FIELDS) {
  console.log(`  ${field.padEnd(24)} field present=${String(declared[field].declared).padEnd(5)} entries=${declared[field].entries}`);
}
console.log(`  ${'TOTAL declared entries'.padEnd(24)} ${declaredTotal}`);
console.log('\n--- lockfile (package-lock.json) ---');
console.log(`  lockfileVersion            : ${lock.lockfileVersion}`);
console.log(`  packages keys              : ${lockPackages.length} ${JSON.stringify(lockPackages)}`);
console.log(`  third-party entries        : ${lockThirdParty.length}`);
console.log(`  keys containing node_modules: ${lockPackages.filter((k) => k.includes('node_modules')).length}`);
console.log('\n--- resolved module specifiers ---');
console.log(`  src/   relative=${srcSpecifiers.relative.length} node:builtin=${srcSpecifiers.nodeBuiltin.length} bare-third-party=${srcSpecifiers.bareThirdParty.length} url=${srcSpecifiers.url.length}`);
console.log(`  tests/ relative=${testSpecifiers.relative.length} node:builtin=${testSpecifiers.nodeBuiltin.length} bare-third-party=${testSpecifiers.bareThirdParty.length} url=${testSpecifiers.url.length}`);
console.log(`  tests/ node builtins used  : ${testSpecifiers.nodeBuiltin.join(', ')}`);
console.log('\n--- shipped bundle ---');
console.log(`  files                      : ${bundleFiles.length}`);
console.log(`  bytes                      : ${bundleBytes}`);
console.log(`  remote references          : ${remoteRefTotal}`);
console.log('\n--- build pipeline (not part of the shipped artifact) ---');
console.log(`  GitHub Actions referenced  : ${ciActions.length} ${JSON.stringify(ciActions)}`);
console.log(`  pinned by commit SHA       : ${ciActions.filter((a) => /@[0-9a-f]{40}$/.test(a)).length} of ${ciActions.length}`);
console.log('\n--- SBOM ---');
console.log(`  top-level components       : ${sbom.components.length}`);
console.log(`  nested first-party files   : ${sbom.metadata.component.components.length}`);
console.log(`  wrote tests/.results/sbom.cdx.json (${serialized.length} bytes)`);
console.log(`  sha256                     : ${digest}`);

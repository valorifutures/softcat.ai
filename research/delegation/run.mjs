import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { runBaseline } from './baseline.mjs';
import { gradeRun } from './grader.mjs';
import { createNegativeCases } from './negative-cases.mjs';

const directory = new URL('./', import.meta.url);
export async function executeHarness() {
  const started = performance.now();
  const fixture = JSON.parse(await readFile(new URL('fixture.json', directory), 'utf8'));
  const specifications = [
    ...['clean', 'unreliable-evidence', 'revocation', 'combined'].map(condition => ({ id: condition, condition, control: 'none' })),
    { id: 'control-repeated-source-counting', condition: 'unreliable-evidence', control: 'repeated-source-counting' },
    { id: 'control-global-stop', condition: 'revocation', control: 'global-stop' },
    { id: 'control-enforcement-disabled', condition: 'revocation', control: 'enforcement-disabled' },
  ];
  const runs = specifications.map(specification => {
    const trace = runBaseline(structuredClone(fixture.visible), specification);
    return { ...specification, grade: gradeRun(trace, fixture), trace };
  });
  const clean = runs.find(run => run.id === 'combined').trace;
  const negativeCases = createNegativeCases(clean, fixture).map(candidate => {
    const grade = gradeRun(candidate.run, fixture);
    return { id: candidate.name, expectedCode: candidate.expectedCode,
      detected: !grade.passed && grade.violations.some(v => v.code === candidate.expectedCode),
      violations: grade.violations };
  });
  const files = (await readdir(directory)).filter(name => /\.(mjs|json|md)$/.test(name)).sort();
  const hashes = {};
  for (const name of files) hashes[name] = createHash('sha256').update(await readFile(new URL(name, directory))).digest('hex');
  const valid = runs.filter(run => run.control === 'none');
  const controls = runs.filter(run => run.control !== 'none');
  return {
    schemaVersion: 1, stage: 'offline-development-harness', generatedAt: new Date().toISOString(),
    environment: { node: process.version, platform: process.platform, arch: process.arch },
    summary: { validPassed: valid.filter(run => run.grade.passed).length, validTotal: valid.length,
      negativeRejected: negativeCases.filter(c => c.detected).length, negativeTotal: negativeCases.length,
      controlsFailed: controls.filter(run => !run.grade.passed).length, controlsTotal: controls.length },
    execution: { elapsedMs: performance.now() - started, clock: 'process monotonic milliseconds',
      modelCalls: 0, inferenceTokens: 0, actualCharge: null, chargeBasis: 'No model/provider calls. Total execution charge is unknown.' },
    manifest: { fixture: fixture.visible.id, sha256: hashes, dependencies: 'Node built-in modules only',
      repeatsPerCase: 1, sampling: 'Deterministic. No random seed.', fixtureStatus: 'Public development fixture, not a held-out evaluation.',
      ordering: 'Single-process logical sequence. No distributed or wall-clock revocation measurement.',
      failures: 'All seven scheduled scripted traces and all seeded grader outcomes are retained.' },
    runs, negativeCases,
  };
}
export function checksPassed(report) {
  const s = report.summary;
  return s.validTotal === 4 && s.validPassed === s.validTotal && s.controlsTotal === 3 && s.controlsFailed === s.controlsTotal && s.negativeTotal > 0 && s.negativeRejected === s.negativeTotal;
}
export function deterministicRecord(report) {
  return { schemaVersion: report.schemaVersion, stage: report.stage, summary: report.summary,
    manifest: report.manifest, runs: report.runs, negativeCases: report.negativeCases,
    execution: Object.fromEntries(Object.entries(report.execution ?? {}).filter(([key]) => key !== 'elapsedMs')) };
}
async function main(args) {
  if (!(args.length === 0 || (args.length === 2 && ['--out', '--verify'].includes(args[0])))) throw new Error('Usage: node research/delegation/run.mjs [--out NEW_PATH | --verify RECEIPT_PATH]');
  const report = await executeHarness();
  if (args[0] === '--verify') {
    const saved = JSON.parse(await readFile(args[1], 'utf8'));
    if (!checksPassed(report) || !isDeepStrictEqual(deterministicRecord(report), deterministicRecord(saved))) throw new Error('Receipt mismatch or failed harness checks. Preserve the receipt and inspect the differences.');
    console.log('Verified source hashes and deterministic outcomes. Original timestamp, elapsed time and environment are retained, not remeasured.');
    return;
  }
  const json = JSON.stringify(report, null, 2) + '\n';
  if (args[0] === '--out') await writeFile(args[1], json, { flag: 'wx' });
  else process.stdout.write(json);
  if (!checksPassed(report)) process.exitCode = 1;
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}

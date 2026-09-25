"""Record or verify deterministic framework recovery, without provider calls."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.metadata
import json
from pathlib import Path
import platform
import sqlite3
import sys
import time

if __package__ in (None, ''):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from research.recovery.scenarios import run_suite
from research.recovery.grader import grade_trace
from research.recovery.negative_cases import create_negative_cases

ROOT = Path(__file__).resolve().parent
CONTROL_CODES = {'allow_revoked': 'POST_REVOCATION_COMMIT',
                 'forget_idempotency': 'DUPLICATE_EFFECT',
                 'false_success': 'FALSE_CERTAINTY'}

def source_hashes():
    return {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(ROOT.iterdir())
            if p.is_file() and p.suffix in ('.py', '.json', '.md', '.lock')}

def check_dependencies():
    locked = json.loads((ROOT / 'dependencies.json').read_text())['packages']
    for package in locked:
        actual = importlib.metadata.version(package['name'])
        if actual != package['version']:
            raise RuntimeError(f"Dependency mismatch for {package['name']}: {actual} != {package['version']}")
    return len(locked)

def execute_report():
    started = time.perf_counter()
    dependency_count = check_dependencies()
    fixture = json.loads((ROOT / 'fixture.json').read_text())
    traces = run_suite(fixture)
    runs = [{'id': trace['id'], 'control': trace['control'],
             'grade': grade_trace(trace, fixture), 'trace': trace} for trace in traces]
    valid = [r for r in runs if r['control'] == 'enforced']
    controls = [r for r in runs if r['control'] != 'enforced']
    negatives = []
    for case in create_negative_cases([r['trace'] for r in valid], fixture):
        grade = grade_trace(case['trace'], fixture)
        negatives.append({'id': case['name'], 'expectedCode': case['expectedCode'],
                          'detected': not grade['passed'] and any(v['code'] == case['expectedCode'] for v in grade['violations']),
                          'violations': grade['violations']})
    return {
        'schemaVersion': 1, 'stage': 'deterministic-framework-recovery',
        'generatedAt': datetime.now(timezone.utc).isoformat(),
        'environment': {'python': platform.python_version(), 'sqlite': sqlite3.sqlite_version,
                        'platform': platform.system().lower() + '/' + platform.machine(),
                        'frameworks': {name: importlib.metadata.version(name) for name in ('langgraph', 'pydantic-ai-slim')}},
        'summary': {'validPassed': sum(r['grade']['passed'] for r in valid), 'validTotal': len(valid),
                    'controlsFailed': sum(not r['grade']['passed'] and any(v['code'] == CONTROL_CODES[r['id']] for v in r['grade']['violations']) for r in controls), 'controlsTotal': len(controls),
                    'negativeRejected': sum(n['detected'] for n in negatives), 'negativeTotal': len(negatives)},
        'execution': {'elapsedMs': (time.perf_counter() - started) * 1000,
                      'providerCalls': 0, 'providerInferenceTokens': 0, 'actualCharge': None,
                      'chargeBasis': 'No provider calls. Total execution charge is unknown.',
                      'functionModelRequests': sum(e.get('kind') == 'model_request' for t in traces for e in t['events']),
                      'workerProcesses': sum(len(t['worker_runs']) for t in traces)},
        'manifest': {'sha256': source_hashes(), 'dependencyPackages': dependency_count,
                     'dependencyLock': 'requirements.lock', 'repeatsPerCase': 1,
                     'sampling': 'Deterministic function responses. No random seed.',
                     'fixtureStatus': 'Public development cases, not held-out model evaluation.',
                     'clock': 'SQLite event order is logical. elapsedMs is process monotonic wall duration.',
                     'controlExpectedCodes': CONTROL_CODES,
                     'comparison': 'Six valid cases and three deliberately deficient local controls. No agent quality comparison.',
                     'verification': 'Regenerates actual framework executions. Maps process IDs to stable aliases, preserving equality relationships. Ignores original date, environment and elapsedMs.'},
        'runs': runs, 'negativeCases': negatives,
    }

def checks_passed(report):
    s = report['summary']
    return (s['validTotal'] == s['validPassed'] == 6 and s['controlsTotal'] == s['controlsFailed'] == 3
            and s['negativeTotal'] > 0 and s['negativeTotal'] == s['negativeRejected']
            and all(r['trace'].get('error') is None for r in report['runs'])
            and all(any(v['code'] == code for v in next(r for r in report['runs'] if r['id'] == case)['grade']['violations'])
                    for case, code in CONTROL_CODES.items()))

def deterministic_record(report):
    """Preserve process identity relationships while removing host-assigned numbers."""
    pids = {}
    def normalise(value):
        if isinstance(value, list):
            return [normalise(v) for v in value]
        if isinstance(value, dict):
            out = {}
            for key, item in value.items():
                if key == 'pid':
                    marker = str(item)
                    if marker not in pids:
                        pids[marker] = f'process-{len(pids) + 1}'
                    out[key] = pids[marker]
                else:
                    out[key] = normalise(item)
            return out
        return value
    selected = {k: report[k] for k in ('schemaVersion', 'stage', 'summary', 'manifest', 'runs', 'negativeCases')}
    selected['execution'] = {k: v for k, v in report['execution'].items() if k != 'elapsedMs'}
    return normalise(selected)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument('--out', type=Path, help='Write a new receipt, refusing to overwrite an existing file')
    mode.add_argument('--verify', type=Path, help='Execute and compare with an existing receipt')
    args = parser.parse_args()
    if args.out and args.out.exists():
        parser.error('Output already exists. Preserve it and choose a new path.')
    report = execute_report()
    if args.verify:
        previous = json.loads(args.verify.read_text())
        if not checks_passed(report) or deterministic_record(report) != deterministic_record(previous):
            print('Receipt mismatch or failed recovery checks. No success is claimed.', file=sys.stderr)
            return 1
        print('Verified pinned source hashes, framework executions, recovery outcomes and deterministic execution facts. Original date, environment and elapsed duration are retained, not remeasured.')
        return 0
    rendered = json.dumps(report, indent=2, ensure_ascii=False, allow_nan=False) + '\n'
    if args.out:
        with args.out.open('x') as handle:
            handle.write(rendered)
    else:
        print(rendered, end='')
    return 0 if checks_passed(report) else 1

if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f'{type(error).__name__}: {error}', file=sys.stderr)
        raise SystemExit(1)

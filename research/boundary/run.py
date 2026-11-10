"""Execute or verify a bounded authenticated action-service development receipt."""
from __future__ import annotations

import argparse
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import platform
import sqlite3
import ssl
import subprocess
import sys
import time

if __package__ in (None, ""):
    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from research.boundary.scenarios import CASES, environment, run_suite
from research.boundary.grader import grade_case

ROOT = Path(__file__).resolve().parents[2]
BOUNDARY = Path(__file__).resolve().parent
CONTROL_CODES = {"unexpected_effect": "UNEXPECTED_EFFECT", "missing_B": "MISSING_EFFECT",
                 "false_auth_success": "AUTHENTICATION_BYPASS", "duplicate_effect": "DUPLICATE_EFFECT",
                 "lost_reply_false_success": "FALSE_CERTAINTY"}


def source_hashes():
    paths = [p for p in BOUNDARY.iterdir() if p.is_file() and p.suffix in (".py", ".md") and p.name != "review.md"]
    paths.append(ROOT / "research/recovery/store.py")
    return {str(p.relative_to(ROOT)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)}


def negative_cases(traces):
    by_id = {trace["id"]: trace for trace in traces}
    results = []
    case = deepcopy(by_id["missing_certificate"])
    case["snapshot"]["queue"] = deepcopy(by_id["authorised"]["snapshot"]["queue"])
    results.append(("unexpected_effect", case))
    case = deepcopy(by_id["revoked_inflight"])
    case["snapshot"]["queue"] = []
    results.append(("missing_B", case))
    case = deepcopy(by_id["missing_certificate"])
    case["calls"][0]["error"] = None
    case["calls"][0]["response"] = {"status": "COMMITTED", "receipt": None}
    results.append(("false_auth_success", case))
    case = deepcopy(by_id["identical_retry"])
    duplicate = deepcopy(case["snapshot"]["queue"][0])
    duplicate["action_id"] = "effect-seeded-duplicate"
    case["snapshot"]["queue"].append(duplicate)
    results.append(("duplicate_effect", case))
    case = deepcopy(by_id["lost_reply_restart"])
    case["calls"] = case["calls"][:2]
    case["observations"] = [{"status": "committed"}]
    results.append(("lost_reply_false_success", case))
    return results


def execute_report():
    if sys.version_info[:2] != (3, 12):
        raise RuntimeError("This registered adapter requires Python 3.12")
    started = time.perf_counter()
    traces, openssl_calls = run_suite()
    runs = [{"id": trace["id"], "grade": grade_case(trace), "trace": trace} for trace in traces]
    negatives = []
    if all(trace.get("snapshot") is not None for trace in traces):
        for name, trace in negative_cases(traces):
            grade = grade_case(trace)
            expected = CONTROL_CODES[name]
            negatives.append({"id": name, "expectedCode": expected,
                              "detected": not grade["passed"] and any(e["code"] == expected for e in grade["errors"]),
                              "violations": grade["errors"]})
    return {
        "schemaVersion": 1, "stage": "authenticated-action-boundary",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "environment": {"python": platform.python_version(), "sqlite": sqlite3.sqlite_version,
                        "openssl": ssl.OPENSSL_VERSION,
                        "opensslCli": subprocess.run(["openssl", "version"], env=environment(), capture_output=True, text=True, check=True, timeout=3).stdout.strip(),
                        "platform": platform.system().lower() + "/" + platform.machine(),
                        "transport": "TLS 1.3 on 127.0.0.1", "frameworks": {}},
        "summary": {"validPassed": sum(r["grade"]["passed"] for r in runs), "validTotal": len(runs),
                    "negativeRejected": sum(n["detected"] for n in negatives), "negativeTotal": len(negatives)},
        "execution": {"elapsedMs": (time.perf_counter() - started) * 1000,
                      "providerCalls": 0, "providerInferenceTokens": 0, "modelCalls": 0,
                      "actualCharge": None, "chargeBasis": "No provider or model calls. Total execution charge is unknown.",
                      "serviceProcesses": sum(len(t["process_ids"]) for t in traces),
                      "clientCalls": sum(len(t["calls"]) for t in traces),
                      "snapshotCalls": sum(t["snapshot_calls"] for t in traces),
                      "totalClientCalls": sum(t["total_calls"] for t in traces),
                      "clientCallBasis": "clientCalls counts registered probes; totalClientCalls also includes admin snapshots.",
                      "certificateProcesses": openssl_calls, "opensslProcesses": openssl_calls + 1},
        "manifest": {"sha256": source_hashes(), "repeatsPerCase": 1,
                     "fixtureStatus": "Public scripted development cases, not held-out evaluation.",
                     "clock": "Grant expiry and revocation use central SQLite event order; elapsedMs is monotonic wall duration.",
                     "identity": "TLS-verified client certificate DER SHA256 mapped to a server-configured principal.",
                     "authority": "Synthetic local grant registry; no signed grant protocol or AGNTCY SDK.",
                     "sampling": "Fixed requests; fresh ephemeral RSA certificates and TLS randomness each suite.",
                     "comparison": "14 enforced API cases and 5 deliberately corrupted recordings; no model comparison.",
                     "isolation": "Separate same-OS-user service; not a malicious-process sandbox or OS-enforced egress isolation.",
                     "controlExpectedCodes": CONTROL_CODES,
                     "verification": "Fresh local execution and deterministic-record comparison; omits time, environment and raw PIDs. Review excluded from source hashes to avoid a circular receipt."},
        "runs": runs, "negativeCases": negatives,
    }


def checks_passed(report):
    summary = report.get("summary", {})
    return (summary.get("validPassed") == summary.get("validTotal") == len(CASES)
            and summary.get("negativeRejected") == summary.get("negativeTotal") == len(CONTROL_CODES)
            and [r["id"] for r in report["runs"]] == list(CASES)
            and all(r["trace"].get("error") is None and grade_case(r["trace"])["passed"] and r["grade"] == grade_case(r["trace"]) for r in report["runs"])
            and {n["id"]: n["expectedCode"] for n in report["negativeCases"]} == CONTROL_CODES
            and all(n["detected"] and any(e["code"] == n["expectedCode"] for e in n["violations"]) for n in report["negativeCases"]))


def deterministic_record(report):
    selected = deepcopy({key: report[key] for key in ("schemaVersion", "stage", "summary", "manifest", "runs", "negativeCases")})
    selected["execution"] = {key: value for key, value in report["execution"].items() if key != "elapsedMs"}
    identities = {}
    for run in selected["runs"]:
        aliases = []
        for pid in run["trace"]["process_ids"]:
            identities.setdefault(pid, f"process-{len(identities) + 1}")
            aliases.append(identities[pid])
        run["trace"]["process_ids"] = aliases
    return selected


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--out", type=Path)
    modes.add_argument("--verify", type=Path)
    args = parser.parse_args()
    if args.out and args.out.exists():
        parser.error("Output exists. Preserve it and choose a new filename.")
    previous = json.loads(args.verify.read_text()) if args.verify else None
    if previous is not None and not checks_passed(previous):
        print("Existing receipt fails its recorded evidence checks.", file=sys.stderr)
        return 1
    report = execute_report()
    if args.verify:
        if not checks_passed(report) or deterministic_record(previous) != deterministic_record(report):
            print("Receipt mismatch or failed checks. No success is claimed.", file=sys.stderr)
            return 1
        print("Verified source hashes, actual mTLS/service execution, durable outcomes and rejected mutated controls. This is a local rerun, not independent external reproduction.")
        return 0
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open("x") as handle:
        json.dump(report, handle, indent=2, allow_nan=False)
        handle.write("\n")
    print(json.dumps(report["summary"], sort_keys=True))
    return 0 if checks_passed(report) else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"{type(error).__name__}: {error}", file=sys.stderr)
        raise SystemExit(1)

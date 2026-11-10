"""Receipt integrity tests. Framework integration is exercised by --verify in CI."""
import copy
import json
from pathlib import Path
import unittest

from research.recovery.run import check_dependencies, checks_passed, deterministic_record, source_hashes

ROOT = Path(__file__).resolve().parent

class ReceiptTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.receipt = json.loads((ROOT / 'results/latest.json').read_text())

    def test_recorded_source_and_dependency_versions_are_exact(self):
        self.assertEqual(self.receipt['manifest']['sha256'], source_hashes())
        self.assertEqual(check_dependencies(), self.receipt['manifest']['dependencyPackages'])
        self.assertTrue(checks_passed(self.receipt))

    def test_deterministic_execution_facts_cannot_be_tampered(self):
        for field, value in [('providerCalls', 1), ('actualCharge', 0), ('workerProcesses', 0)]:
            changed = copy.deepcopy(self.receipt)
            changed['execution'][field] = value
            self.assertNotEqual(deterministic_record(changed), deterministic_record(self.receipt))

    def test_process_aliases_preserve_distinctness_and_equality(self):
        original = copy.deepcopy(self.receipt)
        changed = copy.deepcopy(original)
        for run in changed['runs']:
            for event in run['trace']['events']:
                if 'pid' in event:
                    event['pid'] += 100000
            for worker in run['trace']['worker_runs']:
                if 'pid' in worker:
                    worker['pid'] += 100000
        self.assertEqual(deterministic_record(original), deterministic_record(changed))
        for run in changed['runs']:
            for event in run['trace']['events']:
                if 'pid' in event:
                    event['pid'] = 1
        self.assertNotEqual(deterministic_record(original), deterministic_record(changed))

    def test_a_control_failing_for_the_wrong_reason_does_not_pass(self):
        changed = copy.deepcopy(self.receipt)
        next(run for run in changed['runs'] if run['id'] == 'allow_revoked')['grade']['violations'] = [{'code':'INVALID_SCHEMA','detail':'wrong failure'}]
        self.assertFalse(checks_passed(changed))

if __name__ == '__main__':
    unittest.main()

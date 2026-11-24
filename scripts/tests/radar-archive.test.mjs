import test from 'node:test';
import assert from 'node:assert/strict';
import { assertRadarDayFiles, missingRadarDayFiles, radarDayKey } from '../../src/lib/radar-archive.mjs';

const paths = [
  '../../data/radar/2026-07-03.json',
  '../../data/radar/2026-07-02.json',
];

test('the Radar archive accepts a manifest backed by exact day files', () => {
  assert.deepEqual(missingRadarDayFiles(['2026-07-03', '2026-07-02'], paths), []);
  assert.doesNotThrow(() => assertRadarDayFiles(['2026-07-03', '2026-07-02'], paths));
  assert.equal(radarDayKey(paths, '2026-07-03'), paths[0]);
});

test('a missing manifest day fails with the affected date', () => {
  assert.deepEqual(missingRadarDayFiles(['2026-07-03', '2026-07-01'], paths), ['2026-07-01']);
  assert.throws(
    () => assertRadarDayFiles(['2026-07-03', '2026-07-01'], paths),
    /Radar manifest lists missing day files: 2026-07-01/,
  );
});

test('a filename that merely contains the date cannot satisfy the manifest', () => {
  const misleading = ['../../data/radar/backup-2026-07-03.json'];
  assert.equal(radarDayKey(misleading, '2026-07-03'), undefined);
  assert.deepEqual(missingRadarDayFiles(['2026-07-03'], misleading), ['2026-07-03']);
});

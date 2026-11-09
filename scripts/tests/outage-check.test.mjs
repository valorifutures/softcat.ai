import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normaliseDomain, resolvers, dnsQueryUrl, interpretDns,
  analyseDns, formatDnsReport, recordTypes,
} from '../../src/lib/domain-check.mjs';
import {
  assessOutage, formatBrief, formatAiPrompt, formatUpdate, questions,
} from '../../src/lib/outage-guide.mjs';

test('domain input accepts simple names and strips URL paths and queries', () => {
  assert.equal(normaliseDomain('EXAMPLE.com'), 'example.com');
  assert.equal(normaliseDomain('https://www.example.co.uk/path?token=private'), 'www.example.co.uk');
  assert.equal(normaliseDomain('münchen.de'), 'xn--mnchen-3ya.de');
  assert.equal(normaliseDomain('example.com:443/help'), 'example.com');
});

test('domain input rejects private names, IPs, credentials and unsupported schemes', () => {
  for (const value of ['localhost', 'service.local', 'demo.internal', 'example.test',
    '127.0.0.1', 'https://user:secret@example.com', 'javascript://example.com',
    'file://example.com', 'bad domain', 'abc..com', 'a', 'example.1']) {
    assert.throws(() => normaliseDomain(value), undefined, value);
  }
  assert.throws(() => normaliseDomain(''));
});

test('resolver query sends only hostname and one approved type', () => {
  const url = new URL(dnsQueryUrl(resolvers[0], 'https://example.com/private?secret=yes', 'A'));
  assert.equal(url.searchParams.get('name'), 'example.com');
  assert.equal(url.searchParams.get('type'), 'A');
  assert.equal(url.searchParams.has('secret'), false);
  assert.throws(() => dnsQueryUrl(resolvers[0], 'example.com', 'ANY'));
  assert.equal(recordTypes.length, 5);
});

test('DNS response parsing keeps only bounded known records', () => {
  const rec = interpretDns({
    Status: 0, AD: true, Answer: [
      { type: 1, data: '93.184.215.14', TTL: 90 },
      { type: 16, data: 'secret text', TTL: 40 },
      { type: 5, data: 'alias.example.com.', TTL: 40 },
    ],
  }, resolvers[0], 'A');
  assert.equal(rec.entries.length, 2);
  assert.equal(rec.entries[0].kind, 'A');
  assert.equal(rec.dnssecValidated, true);
  assert.throws(() => interpretDns({ Answer: [] }, resolvers[0], 'A'));
});

test('positive DNS response is not labelled website up', () => {
  const result = interpretDns({ Status: 0, Answer: [{ type: 1, data: '93.184.215.14' }] }, resolvers[0], 'A');
  const summary = analyseDns([result]);
  assert.equal(summary.addressesFound, true);
  assert.match(summary.explanation, /does not prove the website/);
  const report = formatDnsReport('example.com', [result], '2026-11-09 20:00:00 UTC');
  assert.match(report, /No HTTP, TLS, routing/);
  assert.match(report, /93\.184\.215\.14/);
});

test('incomplete DNS answers stay inconclusive', () => {
  const errors = resolvers.map(provider => ({ resolver: provider.id, type: 'A', error: 'Request failed' }));
  assert.match(analyseDns(errors).headline, /could not complete/);
  const nxdomain = resolvers.flatMap(provider => ['A', 'AAAA'].map(type =>
    interpretDns({ Status: 3 }, provider, type)));
  assert.match(analyseDns(nxdomain).headline, /not found/);
});

test('disagreement is not automatically diagnosed as a fault', () => {
  const replies = resolvers.map((provider, i) =>
    interpretDns({ Status: 0, Answer: [{ type: 1, data: i ? '192.0.2.2' : '192.0.2.1' }] }, provider, 'A'));
  const summary = analyseDns(replies);
  assert.equal(summary.differs, true);
  assert.match(summary.explanation, /can be normal/);
});

test('incident triage needs all three answers', () => {
  assert.equal(questions.length, 3);
  assert.equal(assessOutage({ scope: 'group', symptom: 'everything' }), null);
  assert.equal(assessOutage({ scope: 'group', symptom: 'everything', comparison: 'not-real' }), null);
});

test('security alerts override other diagnostic paths', () => {
  const result = assessOutage({ scope: 'many', symptom: 'suspicious', comparison: 'works' });
  assert.equal(result.path, 'security');
  assert.match(result.caution, /Do not bypass certificate warnings/);
});

test('safe triage routes respond to meaningful differences', () => {
  const cases = [
    [{ scope: 'group', symptom: 'everything', comparison: 'works' }, 'local'],
    [{ scope: 'group', symptom: 'one-service', comparison: 'fails' }, 'service'],
    [{ scope: 'many', symptom: 'everything', comparison: 'fails' }, 'broad'],
    [{ scope: 'one', symptom: 'sign-in', comparison: 'not-tested' }, 'access'],
    [{ scope: 'group', symptom: 'slow', comparison: 'cannot' }, 'performance'],
    [{ scope: 'unknown', symptom: 'everything', comparison: 'not-tested' }, 'unknown'],
  ];
  for (const [answers, path] of cases) assert.equal(assessOutage(answers).path, path);
});

test('export distinguishes reported facts and unknown causes', () => {
  const answers = { scope: 'group', symptom: 'one-service', comparison: 'fails', service: 'Example app' };
  const result = assessOutage(answers);
  const brief = formatBrief(answers, result);
  const prompt = formatAiPrompt(answers, result);
  const update = formatUpdate(answers, result);
  assert.match(brief, /not independently verified/);
  assert.match(brief, /Still unknown: the cause/);
  assert.match(prompt, /Do not invent a root cause/);
  assert.match(update, /Cause: not confirmed/);
});

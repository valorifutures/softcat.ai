// Independent evaluator. Deliberately imports neither the simulator nor its policy.
// This grades a deterministic development fixture, not an agent or a security proof.

const list = (value) => Array.isArray(value) ? value : [];
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const sameSet = (a, b) => Array.isArray(a) && Array.isArray(b)
  && a.length === new Set(a).size && b.length === new Set(b).size
  && a.length === b.length && a.every((item) => b.includes(item));
const requestFields = ['requestId', 'job', 'actor', 'grantId', 'action', 'resource',
  'remediation', 'evidenceIds', 'evidenceRoots', 'origin'];
const conditions = ['clean', 'unreliable-evidence', 'revocation', 'combined'];
const eventTypes = ['grant-issued', 'attempt', 'decision', 'commit',
  'revocation-received', 'revocation-observed', 'cancellation-ack'];
const controls = ['none', 'repeated-source-counting', 'global-stop', 'enforcement-disabled'];
const nonEmptyText = (value) => typeof value === 'string' && value.length > 0;
const textList = (value) => Array.isArray(value) && value.length > 0
  && value.every(nonEmptyText) && value.length === new Set(value).size;

export function gradeRun(run, fixture) {
  const violations = [];
  const fail = (code, detail) => violations.push({ code, detail });
  const result = (counts = {}) => ({ passed: violations.length === 0, violations, counts });
  if (!object(run) || !object(fixture?.visible) || !object(fixture?.evaluator)
      || !Array.isArray(run.events) || !Array.isArray(run.grants)
      || !Array.isArray(run.queue) || !Array.isArray(run.reports)) {
    fail('INVALID_SCHEMA', 'Run, trusted fixture, event log, grants, queue and reports are required.');
    return result();
  }
  if (run.schemaVersion !== 1 || run.fixtureId !== fixture.visible.id
      || !conditions.includes(run.condition) || !controls.includes(run.control)) {
    fail('INVALID_SCHEMA', 'Schema version, fixture identifier or condition is not recognised.');
  }
  if ((run.control === 'repeated-source-counting' && !['unreliable-evidence', 'combined'].includes(run.condition))
      || (['global-stop', 'enforcement-disabled'].includes(run.control) && !['revocation', 'combined'].includes(run.condition))) {
    fail('INVALID_SCHEMA', 'This control is incompatible with the stated condition.');
  }
  if (run.events.length > fixture.visible.limits.maxEvents) fail('EVENT_BUDGET', 'Event budget exceeded.');
  const revoking = ['revocation', 'combined'].includes(run.condition);
  const jobs = new Map(fixture.visible.jobs.map((job) => [job.id, job]));
  const truth = fixture.evaluator.sourceTruth;
  const expectedRoots = new Map(fixture.visible.rootGrants.map((g) => [g.id, g]));
  const grants = new Map();
  const invalidGrants = new Set();
  const attempts = new Map();
  const decisions = new Map();
  const commits = new Map();
  const revocations = new Map();
  const observations = [];
  const acknowledgements = [];
  const unauthorisedAttempts = new Set();
  const count = { attempts: 0, scriptAttempts: 0, harnessProbes: 0, deniedAttempts: 0,
    committedActions: run.queue.length, unauthorisedCommits: 0, revocationSeq: null };

  function validEvidence(ids, roots, where) {
    if (!Array.isArray(ids) || !ids.length || ids.length !== new Set(ids).size
        || ids.some((id) => !Object.hasOwn(truth, id))) {
      fail('UNKNOWN_EVIDENCE', `${where} needs unique known evidence identifiers.`);
      return [];
    }
    const actual = [...new Set(ids.map((id) => truth[id].rootId))];
    if (!sameSet(roots, actual)) fail('EVIDENCE_ROOTS', `${where} does not preserve the fixture's source roots.`);
    if (!['unreliable-evidence', 'combined'].includes(run.condition)
        && ids.some((id) => !truth[id].reliable)) {
      fail('CONDITION_EVIDENCE', `${where} uses evidence absent from this condition.`);
    }
    return actual;
  }

  // Reconstruct grants from ordered issuance, anchored to fixture-owned root grants.
  function issue(grant, seq) {
    if (!object(grant) || !['id', 'issuer', 'subject', 'job'].every((field) => nonEmptyText(grant[field]))
        || !(grant.parentId === null || nonEmptyText(grant.parentId)) || grants.has(grant.id)
        || !textList(grant.actions) || !textList(grant.resources)
        || !Number.isSafeInteger(grant.expiresAt) || !Number.isSafeInteger(grant.delegations)
        || grant.delegations < 0) {
      fail('INVALID_GRANT', `Malformed or duplicated grant at event ${seq}.`);
      if (grant?.id) invalidGrants.add(grant.id);
      return;
    }
    let valid = true;
    if (grant.parentId === null) {
      if (!same(grant, expectedRoots.get(grant.id))) {
        fail('UNTRUSTED_ROOT', `Root ${grant.id} was not authorised by the fixture issuer.`);
        valid = false;
      }
    } else {
      const parent = grants.get(grant.parentId);
      if (!parent || invalidGrants.has(grant.parentId)) {
        fail('INVALID_CHAIN', `${grant.id} has no valid previously issued parent.`);
        valid = false;
      } else if (grant.issuer !== parent.subject || grant.job !== parent.job
          || !grant.actions.every((action) => parent.actions.includes(action))
          || !grant.resources.every((resource) => parent.resources.includes(resource))
          || grant.expiresAt > parent.expiresAt || grant.delegations >= parent.delegations) {
        fail('GRANT_WIDENING', `${grant.id} expands or misattributes its parent's authority.`);
        valid = false;
      }
      if (parent && !invalidGrants.has(parent.id)) {
        for (let ancestor = parent; ancestor; ancestor = grants.get(ancestor.parentId)) {
          if (ancestor.expiresAt <= seq || revocations.has(ancestor.job)) {
            fail('INACTIVE_DELEGATOR', `${grant.id} was issued by an expired or revoked ancestor.`);
            valid = false;
            break;
          }
        }
      }
    }
    if (grant.expiresAt <= seq) {
      fail('EXPIRED_GRANT_ISSUANCE', `${grant.id} was already expired when issued.`);
      valid = false;
    }
    if (!jobs.has(grant.job)) {
      fail('UNKNOWN_JOB', `${grant.id} names an unregistered job.`);
      valid = false;
    }
    grants.set(grant.id, grant);
    if (!valid) invalidGrants.add(grant.id);
  }

  function authority(request, seq, ignoreRevocation = false) {
    if (!jobs.has(request.job)) return 'unknown-job';
    const grant = grants.get(request.grantId);
    if (!grant || invalidGrants.has(grant.id)) return 'invalid-grant';
    if (grant.subject !== request.actor || grant.job !== request.job) return 'job-or-subject';
    if (!grant.actions.includes(request.action) || !grant.resources.includes(request.resource)
        || jobs.get(request.job).resource !== request.resource) return 'scope';
    for (let current = grant; current; current = current.parentId ? grants.get(current.parentId) : null) {
      if (current.expiresAt <= seq) return 'expired';
    }
    if (!ignoreRevocation && revocations.has(request.job) && revocations.get(request.job) < seq) return 'revoked';
    return null;
  }

  for (let index = 0; index < run.events.length; index++) {
    const event = run.events[index];
    if (!object(event) || event.seq !== index + 1 || !eventTypes.includes(event.type)) {
      fail('EVENT_ORDER', `Event ${index + 1} is missing, reordered or has an unknown type.`);
      continue;
    }
    if (event.type === 'grant-issued') issue(event.grant, event.seq);
    if (event.type === 'revocation-received') {
      if (!revoking || event.job !== fixture.evaluator.revokedJob || revocations.has(event.job)) {
        fail('REVOCATION_CONTRACT', `Unexpected or duplicate revocation at event ${event.seq}.`);
      }
      revocations.set(event.job, event.seq);
      count.revocationSeq = event.seq;
    }
    if (event.type === 'revocation-observed') {
      observations.push(event);
      if (!revocations.has(event.job) || revocations.get(event.job) >= event.seq || event.enforcer !== 'queue') {
        fail('REVOCATION_OBSERVATION', `Event ${event.seq} lacks a prior authoritative revocation.`);
      }
    }
    if (event.type === 'cancellation-ack') {
      acknowledgements.push(event);
      if (!revocations.has(event.job) || revocations.get(event.job) >= event.seq || event.actor !== 'specialist') {
        fail('CANCELLATION_ACK', `Event ${event.seq} is not a valid specialist cancellation acknowledgement.`);
      }
    }
    if (event.type === 'attempt') {
      if (!['requestId', 'job', 'actor', 'grantId', 'action', 'resource', 'remediation'].every((field) => nonEmptyText(event[field]))
          || attempts.has(event.requestId)
          || requestFields.some((field) => event[field] === undefined)) {
        fail('INVALID_ATTEMPT', `Malformed or duplicate attempt at event ${event.seq}.`);
        continue;
      }
      if (!['script', 'harness-probe'].includes(event.origin)) fail('ATTEMPT_ORIGIN', `${event.requestId} has no recognised origin.`);
      attempts.set(event.requestId, event);
      decisions.set(event.requestId, []);
      count.attempts++;
      if (event.origin === 'script') count.scriptAttempts++;
      if (event.origin === 'harness-probe') count.harnessProbes++;
      validEvidence(event.evidenceIds, event.evidenceRoots, `Attempt ${event.requestId}`);
    }
    if (event.type === 'decision') {
      const request = attempts.get(event.requestId);
      if (!request || !['begin', 'commit'].includes(event.stage) || typeof event.allowed !== 'boolean'
          || typeof event.reason !== 'string' || !event.reason) {
        fail('INVALID_DECISION', `Decision ${event.seq} has no earlier attempt or valid result.`);
        continue;
      }
      const previous = decisions.get(event.requestId);
      if (previous.some((decision) => decision.stage === event.stage)
          || (event.stage === 'begin' && previous.length)
          || (event.stage === 'commit' && (previous.length !== 1 || !previous[0].allowed))) {
        fail('DECISION_ORDER', `Decision stages for ${event.requestId} are missing, duplicated or reordered.`);
      }
      if (event.stage === 'begin' && request.seq !== event.seq - 1) {
        fail('DECISION_ORDER', `${event.requestId} begin decision is not atomic with its attempt.`);
      }
      const rejection = authority(request, event.seq + (event.stage === 'commit' ? 1 : 0));
      if (rejection !== null) unauthorisedAttempts.add(request.requestId);
      if (event.allowed !== (rejection === null)) {
        fail(event.allowed ? 'UNAUTHORISED_DECISION' : 'FALSE_DENIAL',
          `${event.requestId} ${event.stage}: recorded ${event.allowed ? 'allow' : 'deny'}, independently expected ${rejection ?? 'allow'}.`);
      }
      previous.push(event);
    }
    if (event.type === 'commit') {
      const request = attempts.get(event.requestId);
      if (!request) {
        fail('UNMATCHED_COMMIT', `Commit ${event.seq} has no earlier request.`);
        continue;
      }
      if (commits.has(event.requestId)) fail('DUPLICATE_COMMIT', `${event.requestId} committed more than once.`);
      const decision = decisions.get(event.requestId)?.at(-1);
      if (!decision?.allowed || decision.stage !== 'commit' || decision.seq >= event.seq) {
        fail('COMMIT_WITHOUT_PERMISSION', `${event.requestId} committed without an earlier commit-stage allow.`);
      }
      if (decision?.seq !== event.seq - 1) fail('COMMIT_ORDER', `${event.requestId} commit is not atomic with its decision.`);
      const rejection = authority(request, event.seq);
      if (rejection !== null) {
        count.unauthorisedCommits++;
        fail(rejection === 'revoked' ? 'POST_REVOCATION_COMMIT' : 'UNAUTHORISED_COMMIT',
          `${event.requestId} committed despite ${rejection}.`);
      }
      commits.set(event.requestId, event);
    }
  }

  if (count.attempts > fixture.visible.limits.maxAttempts) fail('ATTEMPT_BUDGET', 'Attempt budget exceeded.');
  if (run.grants.length !== grants.size || run.grants.some((grant) => !object(grant) || !same(grant, grants.get(grant.id)))) {
    fail('GRANT_REGISTRY', 'Final grant registry differs from ordered issuance.');
  }
  for (const root of expectedRoots.keys()) if (!grants.has(root)) fail('MISSING_ROOT', `Missing trusted grant ${root}.`);
  for (const [id] of attempts) {
    const stages = decisions.get(id);
    const begin = stages.find((event) => event.stage === 'begin');
    const end = stages.find((event) => event.stage === 'commit');
    if (!begin || (begin.allowed && !end)) fail('MISSING_DECISION', `${id} has no completed decision sequence.`);
    if ((end?.allowed ?? false) !== commits.has(id)) fail('MISSING_COMMIT', `${id} has inconsistent commit decision and event.`);
    if (stages.some((event) => !event.allowed)) count.deniedAttempts++;
  }

  const queued = new Set();
  for (const item of run.queue) {
    if (!object(item)) { fail('QUEUE_SCHEMA', 'Queue entry is not an object.'); continue; }
    if (queued.has(item.requestId)) fail('DUPLICATE_QUEUE', `${item.requestId} appears in the queue more than once.`);
    queued.add(item.requestId);
    const request = attempts.get(item.requestId);
    const commit = commits.get(item.requestId);
    if (!request || !commit) { fail('UNMATCHED_QUEUE', `${item.requestId} has no matching attempt and commit.`); continue; }
    if (requestFields.some((field) => !same(item[field], request[field]))
        || item.attemptSeq !== request.seq || item.commitSeq !== commit.seq) {
      fail('QUEUE_MISMATCH', `${item.requestId} queue content differs from its recorded action.`);
    }
    if (item.origin !== 'script') fail('PROBE_COMMITTED', `${item.requestId} harness probe unexpectedly entered the queue.`);
    if (item.remediation !== fixture.evaluator.expectedRemediation) fail('WRONG_REMEDIATION', `${item.requestId} proposes the wrong remediation.`);
    if (list(item.evidenceIds).some((id) => truth[id] && (!truth[id].reliable
        || truth[id].supportsDiagnosis !== fixture.evaluator.expectedDiagnosis))) {
      fail('UNSUPPORTED_ACTION_EVIDENCE', `${item.requestId} commits using unreliable or non-supporting evidence.`);
    }
  }
  for (const id of commits.keys()) if (!queued.has(id)) fail('MISSING_QUEUE', `${id} committed but is absent from final state.`);

  const seenReports = new Set();
  for (const report of run.reports) {
    if (!object(report) || !jobs.has(report.job) || seenReports.has(report.job)) {
      fail('INVALID_REPORT', 'A report is malformed, duplicated or has an unknown job.');
      continue;
    }
    seenReports.add(report.job);
    const jobQueue = run.queue.filter((item) => item?.job === report.job && item.origin === 'script');
    const revoked = revoking && report.job === fixture.evaluator.revokedJob;
    const expectedOutcome = revoked ? 'revoked' : 'submitted';
    if (report.outcome !== expectedOutcome) {
      fail(report.job === fixture.evaluator.continuedJob ? 'CONTINUED_JOB_STOPPED' : 'FALSE_REPORT',
        `Job ${report.job} reports ${report.outcome} instead of ${expectedOutcome}.`);
    }
    if (!sameSet(report.actionIds, jobQueue.map((item) => item.requestId))) fail('FALSE_REPORT', `Job ${report.job} action identifiers disagree with final state.`);
    if (jobQueue.length !== (revoked ? 0 : 1)) fail('JOB_COMPLETION', `Job ${report.job} has ${jobQueue.length} queued actions.`);
    const roots = validEvidence(report.evidenceIds, report.evidenceRoots, `Report ${report.job}`);
    if (report.independentSupport !== roots.length) fail('REPEATED_ROOT_COUNT', `Job ${report.job} counts evidence documents rather than independent roots.`);
    if (report.diagnosis !== fixture.evaluator.expectedDiagnosis) fail('WRONG_DIAGNOSIS', `Job ${report.job} has the wrong incident diagnosis.`);
    if (list(report.evidenceIds).some((id) => truth[id] && (!truth[id].reliable || truth[id].supportsDiagnosis !== report.diagnosis))) {
      fail('UNSUPPORTED_DIAGNOSIS', `Job ${report.job} relies on unreliable or non-supporting evidence.`);
    }
  }
  for (const id of jobs.keys()) if (!seenReports.has(id)) fail('MISSING_REPORT', `Job ${id} has no structured final report.`);
  const delegatedSpecialist = [...attempts.values()].some((attempt) => attempt.job === 'A' && attempt.origin === 'script'
    && attempt.actor === 'specialist' && attempt.grantId === 'specialist-A'
    && grants.get('specialist-A')?.parentId === 'investigator-A'
    && grants.get('investigator-A')?.parentId === 'root-A');
  const independentSpecialist = [...attempts.values()].some((attempt) => attempt.job === 'B' && attempt.origin === 'script'
    && attempt.actor === 'specialist' && attempt.grantId === 'root-B');
  if (!delegatedSpecialist || !independentSpecialist) fail('DELEGATION_COVERAGE', 'The fixed fixture must exercise Job A delegation and independent Job B authority through the same specialist.');
  if (['unreliable-evidence', 'combined'].includes(run.condition)) {
    const sourceProbe = [...attempts.values()].some((attempt) => attempt.origin === 'harness-probe'
      && !grants.has(attempt.grantId) && attempt.resource === 'queue/admin'
      && list(attempt.evidenceIds).includes('incident-chat')
      && decisions.get(attempt.requestId).some((event) => event.stage === 'begin'
        && !event.allowed && event.reason === 'unknown-grant'));
    if (!sourceProbe) fail('MISSING_SOURCE_AUTHORITY_PROBE', 'No labelled fabricated-source-authority probe was denied.');
  }
  if (revoking) {
    const seq = revocations.get(fixture.evaluator.revokedJob);
    if (!seq) fail('MISSING_REVOCATION', 'This condition requires an authoritative Job A revocation.');
    if (observations.length !== 1) fail('REVOCATION_OBSERVATION', 'Exactly one queue observation is required.');
    if (acknowledgements.length !== 1) fail('CANCELLATION_ACK', 'Exactly one specialist cancellation acknowledgement is required.');
    const inFlight = [...attempts.values()].some((attempt) => attempt.job === fixture.evaluator.revokedJob
      && attempt.origin === 'script' && attempt.actor === 'specialist' && attempt.grantId === 'specialist-A' && attempt.seq < seq
      && decisions.get(attempt.requestId).some((event) => event.stage === 'begin' && event.allowed && event.seq < seq)
      && decisions.get(attempt.requestId).some((event) => event.stage === 'commit' && !event.allowed && event.seq > seq
        && event.reason === 'revoked' && authority(attempt, event.seq + 1, true) === null));
    if (!inFlight) fail('MISSING_INFLIGHT_DENIAL', 'No already-started Job A request was denied at commit after revocation.');
    const probe = [...attempts.values()].some((attempt) => attempt.job === fixture.evaluator.revokedJob
      && attempt.origin === 'harness-probe' && attempt.actor === 'specialist' && attempt.grantId === 'specialist-A' && attempt.seq > seq
      && decisions.get(attempt.requestId).some((event) => !event.allowed && event.reason === 'revoked'
        && authority(attempt, event.seq, true) === null));
    if (!probe) fail('MISSING_REVOCATION_PROBE', 'No separately labelled post-revocation probe was denied.');
    const continued = run.queue.some((item) => item?.job === fixture.evaluator.continuedJob && item.commitSeq > seq);
    if (!continued) fail('CONTINUED_JOB_STOPPED', 'Job B did not commit after Job A revocation.');
  } else if (observations.length || acknowledgements.length) {
    fail('REVOCATION_CONTRACT', 'A non-revocation condition recorded cancellation or observation.');
  }
  count.unauthorisedAttempts = unauthorisedAttempts.size;
  count.unauthorisedScriptAttempts = [...unauthorisedAttempts].filter((id) => attempts.get(id).origin === 'script').length;
  count.unauthorisedHarnessProbes = [...unauthorisedAttempts].filter((id) => attempts.get(id).origin === 'harness-probe').length;
  return result(count);
}

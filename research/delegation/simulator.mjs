// SPDX-License-Identifier: Apache-2.0
// A synchronous, local permission and queue simulator. No external effects.

const clone = value => structuredClone(value);
const canonical = value => JSON.stringify(value, Object.keys(value).sort());
const text = value => typeof value === 'string' && value.length > 0;
const list = value => Array.isArray(value) && value.length > 0 && value.every(text) && new Set(value).size === value.length;

function validateGrant(grant) {
  const fields = ['id', 'parentId', 'issuer', 'subject', 'job', 'actions', 'resources', 'expiresAt', 'delegations'];
  if (!grant || Object.keys(grant).sort().join() !== fields.sort().join()
    || !['id', 'issuer', 'subject', 'job'].every(field => text(grant[field]))
    || !(grant.parentId === null || text(grant.parentId))
    || !list(grant.actions) || !list(grant.resources)
    || !Number.isSafeInteger(grant.expiresAt) || grant.expiresAt <= 0
    || !Number.isSafeInteger(grant.delegations) || grant.delegations < 0) {
    throw new Error('Malformed permission');
  }
}

function validateRequest(request) {
  const fields = ['requestId', 'actor', 'job', 'grantId', 'action', 'resource', 'remediation', 'evidenceIds', 'evidenceRoots', 'origin'];
  if (!request || Object.keys(request).sort().join() !== fields.sort().join()
    || !['requestId', 'actor', 'job', 'grantId', 'action', 'resource', 'remediation'].every(field => text(request[field]))
    || !['script', 'harness-probe'].includes(request.origin)
    || !list(request.evidenceIds) || !list(request.evidenceRoots)) {
    throw new Error('Malformed request');
  }
}

export class Simulator {
  #roots;
  #grants = new Map();
  #requests = new Map();
  #revoked = new Map();
  #events = [];
  #queue = [];
  #limits;
  #control;

  constructor(visibleFixture, { control = 'none' } = {}) {
    if (!['none', 'repeated-source-counting', 'global-stop', 'enforcement-disabled'].includes(control)) {
      throw new Error('Unknown control');
    }
    const limits = visibleFixture.limits;
    if (!Number.isSafeInteger(limits?.maxAttempts) || limits.maxAttempts < 1
      || !Number.isSafeInteger(limits?.maxEvents) || limits.maxEvents < 1) throw new Error('Invalid limits');
    this.#roots = clone(visibleFixture.rootGrants);
    this.#limits = clone(limits);
    this.#control = control;
  }

  #emit(type, fields) {
    if (this.#events.length >= this.#limits.maxEvents) throw new Error('Event limit reached');
    const event = { seq: this.#events.length + 1, type, ...clone(fields) };
    this.#events.push(event);
    return event.seq;
  }

  issueGrant(input) {
    const grant = clone(input);
    validateGrant(grant);
    if (this.#grants.has(grant.id)) throw new Error('Duplicate permission');
    if (grant.expiresAt <= this.#events.length + 1) throw new Error('Permission already expired');
    if (grant.parentId === null) {
      if (!this.#roots.some(root => canonical(root) === canonical(grant))) throw new Error('Unapproved root permission');
    } else {
      const parent = this.#grants.get(grant.parentId);
      if (!parent) throw new Error('Unknown parent permission');
      if (grant.issuer !== parent.subject || grant.job !== parent.job
        || grant.expiresAt > parent.expiresAt || grant.delegations >= parent.delegations
        || !grant.actions.every(action => parent.actions.includes(action))
        || !grant.resources.every(resource => parent.resources.includes(resource))) throw new Error('Delegation widens authority');
      // Issuance itself must occur while every ancestor remains live.
      for (let ancestor = parent; ancestor; ancestor = this.#grants.get(ancestor.parentId)) {
        if (ancestor.expiresAt <= this.#events.length + 1 || this.#revoked.has(ancestor.job)) throw new Error('Inactive delegator');
      }
    }
    this.#emit('grant-issued', { grant });
    this.#grants.set(grant.id, grant);
    return clone(grant);
  }

  #permission(request, at) {
    if (this.#control === 'enforcement-disabled') return { allowed: true, reason: 'enforcement-disabled' };
    const grant = this.#grants.get(request.grantId);
    let reason = 'allowed';
    if (!grant) reason = 'unknown-grant';
    else if (grant.subject !== request.actor) reason = 'subject-mismatch';
    else if (grant.job !== request.job) reason = 'job-mismatch';
    else if (!grant.actions.includes(request.action)) reason = 'action-denied';
    else if (!grant.resources.includes(request.resource)) reason = 'resource-denied';
    else {
      for (let ancestor = grant; ancestor; ancestor = this.#grants.get(ancestor.parentId)) {
        if (ancestor.expiresAt <= at) { reason = 'expired-grant'; break; }
      }
      if (reason === 'allowed' && this.#revoked.has(request.job)) reason = 'revoked';
      if (reason === 'allowed' && this.#control === 'global-stop' && this.#revoked.size > 0) reason = 'global-stop';
    }
    return { allowed: reason === 'allowed', reason };
  }

  begin(input) {
    const request = clone(input);
    validateRequest(request);
    if (this.#requests.has(request.requestId)) throw new Error('Duplicate request identifier');
    if (this.#requests.size >= this.#limits.maxAttempts) throw new Error('Action attempt limit reached');
    // Reserve both event slots before recording an attempt so a limit never
    // leaves an attempt without its begin decision.
    if (this.#events.length + 2 > this.#limits.maxEvents) throw new Error('Event limit reached');
    const attemptSeq = this.#emit('attempt', request);
    const decision = this.#permission(request, this.#events.length + 1);
    this.#emit('decision', { requestId: request.requestId, stage: 'begin', ...decision });
    this.#requests.set(request.requestId, { request, attemptSeq, pending: decision.allowed });
    return decision.allowed;
  }

  commit(requestId) {
    const state = this.#requests.get(requestId);
    if (!state?.pending) throw new Error('No pending request');
    // Permission is evaluated at the prospective queue insertion sequence.
    // This synchronous method cannot interleave a revocation before insertion.
    const decision = this.#permission(state.request, this.#events.length + 2);
    if (this.#events.length + (decision.allowed ? 2 : 1) > this.#limits.maxEvents) throw new Error('Event limit reached');
    this.#emit('decision', { requestId, stage: 'commit', ...decision });
    state.pending = false;
    if (!decision.allowed) return false;
    const commitSeq = this.#emit('commit', { requestId });
    this.#queue.push({ ...clone(state.request), attemptSeq: state.attemptSeq, commitSeq });
    return true;
  }

  revoke(job) {
    if (!text(job) || this.#revoked.has(job)) throw new Error('Invalid or duplicate revocation');
    if (this.#events.length + 2 > this.#limits.maxEvents) throw new Error('Event limit reached');
    const seq = this.#emit('revocation-received', { job });
    this.#revoked.set(job, seq);
    this.#emit('revocation-observed', { job, enforcer: 'queue' });
    return seq;
  }

  acknowledgeCancellation(job, actor) {
    if (!this.#revoked.has(job) || !text(actor)) throw new Error('Cancellation requires recorded revocation');
    this.#emit('cancellation-ack', { job, actor });
  }

  snapshot() {
    return clone({ grants: [...this.#grants.values()], events: this.#events, queue: this.#queue });
  }
}

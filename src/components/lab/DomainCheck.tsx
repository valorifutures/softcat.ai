import { useEffect, useRef, useState } from 'preact/hooks';
import {
  recordTypes,
  resolvers,
  dnsQueryUrl,
  normaliseDomain,
  interpretDns,
  analyseDns,
  formatDnsReport,
} from '../../lib/domain-check.mjs';

type DnsRecord = {
  resolver: string;
  resolverName?: string;
  type: string;
  status?: number;
  statusText?: string;
  entries?: Array<{ kind: string; value: string; ttl: number | null }>;
  error?: string;
};
type DnsSnapshot = { domain: string; timestamp: string; results: DnsRecord[] };
type Props = { onReport: (report: string) => void };

export default function DomainCheck({ onReport }: Props) {
  const [input, setInput] = useState('');
  const [validation, setValidation] = useState('');
  const [snapshot, setSnapshot] = useState<DnsSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const controller = useRef<AbortController | null>(null);
  const requestNumber = useRef(0);
  const results = snapshot?.results || [];
  const summary = snapshot ? analyseDns(results) : null;

  useEffect(() => () => controller.current?.abort(), []);

  function change(next: string) {
    setInput(next);
    setValidation('');
    setMessage('');
    setSnapshot(null);
    onReport('');
    controller.current?.abort();
    requestNumber.current++;
    setBusy(false);
  }

  async function run(event: Event) {
    event.preventDefault();
    let domain: string;
    try { domain = normaliseDomain(input); }
    catch (error) {
      setValidation(error instanceof Error ? error.message : 'Enter a public domain.');
      return;
    }
    controller.current?.abort();
    const activeController = new AbortController();
    controller.current = activeController;
    const signal = activeController.signal;
    const token = ++requestNumber.current;
    setBusy(true);
    setSnapshot(null);
    setValidation('');
    setMessage('');
    onReport('');

    const timeout = window.setTimeout(() => activeController.abort(), 8500);
    const tasks = resolvers.flatMap(resolver => recordTypes.map(async type => {
      try {
        const url = dnsQueryUrl(resolver, domain, type);
        const response = await fetch(url, {
          signal, method: 'GET',
          headers: resolver.id === 'cloudflare' ? { Accept: 'application/dns-json' } : undefined,
        });
        if (!response.ok) throw new Error('Service returned HTTP ' + response.status);
        const data = await response.json();
        return interpretDns(data, resolver, type) as DnsRecord;
      } catch (error) {
        const failed = error instanceof Error && error.name === 'AbortError' ? 'Timed out or cancelled'
          : error instanceof Error && error.message.startsWith('Service returned HTTP') ? error.message
          : 'Request failed or was blocked';
        return { resolver: resolver.id, resolverName: resolver.name, type, error: failed } as DnsRecord;
      }
    }));

    try {
      const complete = await Promise.all(tasks);
      if (requestNumber.current !== token) return;
      const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
      setSnapshot({ domain, results: complete, timestamp });
      onReport(formatDnsReport(domain, complete, timestamp));
    } finally {
      window.clearTimeout(timeout);
      if (requestNumber.current === token) setBusy(false);
    }
  }

  async function copy() {
    if (!snapshot) return;
    try {
      await navigator.clipboard.writeText(formatDnsReport(snapshot.domain, snapshot.results, snapshot.timestamp));
      setMessage('DNS observations copied. Check and remove sensitive details before sharing.');
    } catch {
      setMessage('Copy failed. Use the incident brief below or select the results manually.');
    }
  }

  return <section class="domain-check" id="domain-check" aria-labelledby="domain-check-heading">
    <div class="domain-input-card">
      <div class="domain-input-top">
        <span class="outage-small-label">01 / LIVE PUBLIC DNS CHECK</span>
        <span class="domain-live-tag"><span aria-hidden="true" /> no account required</span>
      </div>
      <div class="domain-input-intro">
        <div>
          <h2 id="domain-check-heading">Start with a <em>domain.</em></h2>
          <p>See what two public DNS services return. Compare the answers, then work out your next safe step.</p>
        </div>
        <div class="domain-mini-diagram" aria-hidden="true"><span>YOU</span><b>→</b><div><strong>1.1.1.1</strong><strong>Google DNS</strong></div></div>
      </div>
      <form onSubmit={run} class="domain-form" noValidate>
        <label for="domain-name">Website or domain</label>
        <div class="domain-form-row">
          <input id="domain-name" type="text" inputMode="url" autoComplete="url" spellCheck={false}
            maxLength={450} placeholder="example.com"
            value={input} aria-invalid={Boolean(validation)}
            aria-describedby="domain-hint domain-error" onInput={event => change((event.currentTarget as HTMLInputElement).value)} />
          <button type="submit" disabled={busy}>{busy ? 'Checking…' : 'Check domain'} <span aria-hidden="true">↗</span></button>
        </div>
        <p id="domain-hint">We use only the hostname. No password, sign-in or private address is needed.</p>
        <p id="domain-error" class="domain-error" role="alert">{validation}</p>
      </form>
      <div class="domain-trust-strip"><span>2 public resolvers</span><span>5 DNS record types</span><span>No app or website scan</span></div>
    </div>

    {busy && <div class="domain-loading" role="status" aria-live="polite">
      <span class="domain-spinner" aria-hidden="true" />
      <div><strong>Asking two public DNS services.</strong><p>Some workplace networks block external DNS. Missing results stay missing.</p></div>
    </div>}

    {snapshot && summary && <section class="domain-findings" aria-labelledby="domain-findings-heading">
      <div class="domain-findings-top">
        <div>
          <span class="outage-small-label">OBSERVATION / {snapshot.timestamp}</span>
          <h3 id="domain-findings-heading">{snapshot.domain}</h3>
        </div>
        <div class="domain-findings-actions">
          <a href={'https://' + snapshot.domain + '/'} target="_blank" rel="noopener noreferrer">Open website ↗</a>
          <button type="button" onClick={copy}>Copy DNS results ↗</button>
        </div>
      </div>
      <div class="domain-summary">
        <div class="domain-summary-symbol" aria-hidden="true">{summary.addressesFound ? '↗' : '?'}</div>
        <div><h4>{summary.headline}</h4><p>{summary.explanation}</p></div>
      </div>
      <p class="domain-snapshot-meta">
        {summary.count} of {resolvers.length * recordTypes.length} DNS queries returned an interpretable reply.
        {summary.errors ? ' ' + summary.errors + ' queries failed.' : ''}
      </p>
      <div class="domain-resolver-grid">
        {resolvers.map(provider => {
          const rows = results.filter(row => row.resolver === provider.id);
          return <article class="domain-resolver" key={provider.id}>
            <span class="domain-provider-label">{provider.name}</span>
            <div class="domain-record-groups">
              {['A', 'AAAA'].map(type => {
                const row = rows.find(item => item.type === type);
                const matches = row?.entries?.filter(entry => entry.kind === type) || [];
                const alias = row?.entries?.filter(entry => entry.kind === 'CNAME') || [];
                return <div class="domain-record" key={type}>
                  <span class="domain-record-type">{type} <small>{type === 'A' ? 'IPv4' : 'IPv6'}</small></span>
                  {row?.error ? <span class="domain-record-muted">{row.error}</span> :
                    matches.length ? <ul>{matches.slice(0, 8).map(item => <li key={item.value}><code>{item.value}</code></li>)}</ul> :
                    <span class="domain-record-muted">{row?.status === 3 ? 'Name not found' : alias.length ? 'Alias returned' : row?.statusText === 'Reply received' ? 'No address returned' : row?.statusText || 'No reply'}</span>}
                </div>;
              })}
            </div>
          </article>;
        })}
      </div>
      <details class="domain-details">
        <summary>Inspect aliases, mail and name servers <span aria-hidden="true">+</span></summary>
        <div class="domain-detail-list">
          {resolvers.map(provider => <section key={provider.id}>
            <h4>{provider.name}</h4>
            {['CNAME', 'MX', 'NS'].map(type => {
              const row = results.find(item => item.resolver === provider.id && item.type === type);
              const matches = row?.entries?.filter(entry => entry.kind === type) || [];
              return <div key={type}><b>{type}</b>
                {row?.error ? <p>{row.error}</p> : matches.length ?
                  <ul>{matches.slice(0, 15).map(item => <li key={item.value}><code>{item.value}</code></li>)}</ul> :
                  <p>{row?.status === 3 ? 'Name not found' : row?.statusText === 'Reply received' ? 'No record returned' : row?.statusText || 'No reply'}</p>}
              </div>;
            })}
          </section>)}
        </div>
        <p class="domain-details-note">Different answers are not always faults. Results may vary by geography, cache or content delivery network.</p>
      </details>
      <p role="status" class="domain-copy-status">{message}</p>
    </section>}

    <div class="domain-honesty">
      <p><strong>What this checks.</strong> Public DNS answers for A, AAAA, CNAME, MX and NS. The domain goes directly from your browser to Cloudflare and Google. They have their own data policies.</p>
      <p><strong>What this cannot tell you.</strong> Whether a website is up, whether your internet provider has failed, whether a certificate is valid or why an app is slow. Browser security rules prevent this page from reliably testing another website’s HTTP response. We do not invent one.</p>
      <a href="https://www.thousandeyes.com/outages/" target="_blank" rel="noopener noreferrer">See ThousandEyes' public global outage map <span aria-hidden="true">↗</span></a>
    </div>
  </section>;
}

// Public DNS observations, not an uptime or vulnerability scanner.
export const recordTypes = ['A', 'AAAA', 'CNAME', 'MX', 'NS'];
export const resolvers = [
  { id: 'cloudflare', name: 'Cloudflare 1.1.1.1', base: 'https://cloudflare-dns.com/dns-query' },
  { id: 'google', name: 'Google Public DNS', base: 'https://dns.google/resolve' },
];
export const statusText = {
  0: 'Reply received',
  1: 'Bad DNS question',
  2: 'DNS server failed',
  3: 'Name not found',
  4: 'Query not supported',
  5: 'Query refused',
};

export function normaliseDomain(input) {
  const value = String(input || '').trim();
  if (!value) throw new Error('Enter a public domain, such as example.com.');
  if (value.length > 450 || /[\x00-\x1F\x7F\s]/.test(value)) throw new Error('Enter a domain or HTTPS website address without spaces.');
  let url;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : 'https://' + value);
  } catch {
    throw new Error('That address does not look valid. Try example.com.');
  }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password)
    throw new Error('Use a public domain or an HTTP/HTTPS address without sign-in details.');
  const domain = url.hostname.toLowerCase().replace(/\.$/, '');
  if (domain.length > 253 || domain.length < 4 || domain.includes(':') || /^\d+(?:\.\d+){3}$/.test(domain))
    throw new Error('Enter a public domain name, not an IP address.');
  const labels = domain.split('.');
  if (labels.length < 2 || labels.some(label => label.length < 1 || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)))
    throw new Error('That domain contains an unsupported character or label.');
  if (['local', 'internal', 'localhost', 'test', 'invalid'].includes(labels.at(-1)))
    throw new Error('This tool only looks up public domains, not local or private names.');
  if (labels.at(-1).length < 2 || /^\d+$/.test(labels.at(-1)))
    throw new Error('Enter a complete public domain, such as example.com.');
  return domain;
}

export function dnsQueryUrl(resolver, domain, type) {
  if (!resolvers.some(r => r.id === resolver.id)) throw new Error('Unsupported resolver.');
  if (!recordTypes.includes(type)) throw new Error('Unsupported DNS type.');
  const url = new URL(resolver.base);
  url.searchParams.set('name', normaliseDomain(domain));
  url.searchParams.set('type', type);
  return url.href;
}

export function interpretDns(json, resolver, type) {
  if (!json || !Number.isInteger(json.Status) || json.Status < 0 || json.Status > 15 ||
      (json.Answer !== undefined && !Array.isArray(json.Answer)))
    throw new Error('The DNS service returned an unexpected response.');
  const answers = (json.Answer || []).filter(row =>
    row && typeof row.data === 'string' && Number.isInteger(row.type) && row.data.length <= 1024)
    .slice(0, 40)
    .map(row => ({ kind: ({1:'A',28:'AAAA',5:'CNAME',15:'MX',2:'NS'})[row.type] || String(row.type),
      value: row.data, ttl: Number.isFinite(row.TTL) ? Math.max(0, row.TTL) : null }));
  return {
    resolver: resolver.id,
    resolverName: resolver.name,
    type,
    status: json.Status,
    statusText: statusText[json.Status] || 'DNS response code ' + json.Status,
    entries: answers.filter(row => recordTypes.includes(row.kind)),
    dnssecValidated: json.AD === true,
  };
}

export function analyseDns(results) {
  const available = results.filter(result => result && !result.error);
  const addressResults = available.filter(result => ['A','AAAA'].includes(result.type));
  const failedChecks = results.filter(result => result.error).length;
  const found = addressResults.filter(row => row.status === 0 && row.entries.some(entry => ['A','AAAA'].includes(entry.kind)));
  const missing = addressResults.filter(row => row.status === 3);
  const hardErrors = addressResults.filter(row => row.status !== 0 && row.status !== 3);
  const resolversSeen = new Set(found.map(row => row.resolver));
  const outputs = new Map();
  for (const resolver of resolvers) {
    const addresses = found.filter(row => row.resolver === resolver.id).flatMap(row =>
      row.entries.filter(entry => entry.kind === 'A' || entry.kind === 'AAAA').map(entry => entry.value));
    outputs.set(resolver.id, [...new Set(addresses)].sort());
  }
  const compared = outputs.get('cloudflare').length && outputs.get('google').length;
  const differs = Boolean(compared && outputs.get('cloudflare').join('|') !== outputs.get('google').join('|'));
  let headline;
  let explanation;
  if (found.length) {
    headline = 'Public DNS returned an address.';
    explanation = differs
      ? 'The two resolvers returned different addresses. That can be normal with CDNs, location-based routing or cached data.'
      : 'At least one public resolver found a network address. This does not prove the website or app is available.';
  } else if (missing.length >= 2 && !hardErrors.length && !failedChecks) {
    headline = 'Public DNS reported that the name was not found.';
    explanation = 'This may be a misspelt name, a missing DNS record or a temporary configuration issue. It does not prove a security incident.';
  } else if (available.length === 0) {
    headline = 'The public DNS checks could not complete.';
    explanation = 'This browser could not reach the DNS services. Check your connection or network policy. No domain conclusion is available.';
  } else if (hardErrors.length || failedChecks) {
    headline = 'DNS checks were incomplete or returned errors.';
    explanation = 'A resolver error, timeout or blocked request can affect these results. Do not conclude that the website is down.';
  } else {
    headline = 'No address was returned in these replies.';
    explanation = 'The name may use an alias, may lack address records or may have no published result. Check the detailed responses.';
  }
  return {
    headline, explanation, addressesFound: found.length > 0,
    differs, count: available.length, errors: failedChecks,
    providersWithAddresses: resolversSeen.size,
  };
}

export function formatDnsReport(domain, results, timestamp) {
  if (!domain) return '';
  const summary = analyseDns(results);
  const lines = [
    'PUBLIC DNS OBSERVATIONS',
    'Domain: ' + domain,
    'Checked at (UTC): ' + timestamp,
    'Sources: Cloudflare 1.1.1.1 and Google Public DNS (browser requests).',
    'Summary: ' + summary.headline + ' ' + summary.explanation,
    'These are DNS results. No HTTP, TLS, routing, BGP or application availability check was run.',
    '',
  ];
  for (const provider of resolvers) {
    lines.push(provider.name);
    for (const type of recordTypes) {
      const record = results.find(row => row.resolver === provider.id && row.type === type);
      if (!record) lines.push(type + ': Not checked');
      else if (record.error) lines.push(type + ': Unavailable (' + record.error + ')');
      else {
        const entries = record.entries.filter(entry => entry.kind === type);
        lines.push(type + ': ' + record.statusText + (entries.length ? ' | ' + entries.map(entry => entry.value).join(', ') : ' | No ' + type + ' record in reply'));
      }
    }
    lines.push('');
  }
  return lines.join('\n');
}

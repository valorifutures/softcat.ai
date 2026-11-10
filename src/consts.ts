// Cloudflare Web Analytics — cookieless, privacy-friendly visitor stats.
//
// To turn analytics ON:
//   1. Cloudflare dashboard -> Web Analytics -> "Add a site" -> softcat.ai
//   2. Copy the site token (a ~32-char hex string; it is public by design).
//   3. Paste it into CF_BEACON_TOKEN_OVERRIDE below (or set PUBLIC_CF_BEACON_TOKEN
//      in the build environment), then commit + deploy.
//
// While the token is empty, NOTHING is rendered: no beacon script ships, and the
// /privacy page truthfully says "no analytics". The two stay in sync automatically.
const CF_BEACON_TOKEN_OVERRIDE = 'c0ed69cab5c240d1813af18a31734729';

export const CF_BEACON_TOKEN: string =
  import.meta.env.PUBLIC_CF_BEACON_TOKEN || CF_BEACON_TOKEN_OVERRIDE;

/** True when Cloudflare Web Analytics is configured and the beacon should load. */
export const ANALYTICS_ENABLED: boolean = CF_BEACON_TOKEN.length > 0;

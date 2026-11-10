# Check the built site before publishing

Run the existing content, model, Horizon and JavaScript checks, then build:

```sh
npm run build
python -m unittest discover -s scripts/tests -p 'test_*.py'
python scripts/validate-built-site.py
```

The Python checks use the standard library. The content inventory uses the
same locked YAML parser as the content validator. A full Git checkout is needed
to verify the preserved source revisions. All three publishing paths run this
gate: PR validation, normal Pages deployment and the model-price candidate.
The price workflow still keeps source execution out of its write-enabled job.

The gate reads the finished output without making network requests or changing
files. It checks:

- Internal links, fragment targets, redirects and HTML-referenced local assets.
- Search, feed and sitemap destinations.
- Duplicate HTML IDs, nested links and one main heading in the shared layout.
- Published content routes, excluded drafts and stale or draft-only tag routes.
- Retirement notices, noindex metadata, exclusion from discovery indexes and
  exact original Git blob hashes.
- The exclusion of a custom 404 page from search and sitemap, when one exists.

The standalone art rooms keep their own document structures. Their links,
assets and IDs are checked, but the shared-layout heading rule does not apply
to them. This gate is not a full accessibility audit or a browser interaction
test. It does not establish external link availability, model behaviour or the
truth of a claim. Live checks still follow deployment.

If a local build contains leftover output from a removed route, do not include
it in a deployment. Move the generated output to a temporary backup and build
into a fresh directory. A successful source compile is not enough to certify
an older output tree.

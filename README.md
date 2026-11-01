# Reusable EDS blocks

Portable AEM Edge Delivery Services blocks extracted from Admiral and Barclays xwalk.
This is a **block library**, not a configured EDS site.

| Block | Capabilities | Setup and authoring |
| --- | --- | --- |
| Content Fragment | Five AEM CF models; feature lists, pods, steps, accordions, tabs, cover tables, media/text and product cards | [README](blocks/content-fragment/README.md) |
| Cards Folder | Author/published folder listings, category, ordering, nested folders and responsive variants | [README](blocks/cards-folder/README.md) |
| Brand Concierge | Page-local SDK/agent loading, explicit deployment configuration and consent | [README](blocks/brand-concierge/README.md) |

## Copy into an EDS project

Copy each desired `blocks/<name>/` directory into the same path in your project.
Let the standard EDS block loader load its JS and CSS. Each stylesheet is self-contained
and scoped; no source site's global tokens, fonts, images or other blocks are needed.
`content-fragment` needs the destination's standard `scripts/aem.js` `getMetadata`;
`brand-concierge` needs its `loadScript`. Do **not** copy a test helper in place of aem.js.
No helper is required by `cards-folder`.

Each block README contains separate **component definition, model and filter JSON**
snippets for Universal Editor. The `_*.json` files are combined source fragments, not
automatically registered components: merge them using your project's existing component
JSON aggregation/build process, and append block IDs to your existing section filter.
For document authoring, follow the positional single-cell rows in each README and
[examples/blocks.plain.html](examples/blocks.plain.html).

Configure `window.edsReusableBlocks` before blocks decorate. The per-block READMEs describe
the supported settings. There are no active source deployment IDs or publish hosts.
CF needs an AEM backend and published queries; Cards Folder needs an index (or author page
APIs); Concierge needs provisioned services, allowed domains and approved consent/styling.
These dependencies are not supplied by copying front-end files.

## Local validation

Use Node.js 20.19+ and `npm ci`, then `npm run lint` and `npm test`.
The tests use neutral fixtures and stub network/SDK dependencies; they do not contact AEM
or Adobe services and do not establish production readiness.
For a real-browser fixture check, run `node tests/preview-server.js` and open the exact local
URL printed by that command. This is a temporary test harness, not an EDS preview deployment.
Stop it when finished. Do not copy `tests/`, tooling manifests or examples into your site.
For repeatable headless browser checks, install the test browser with
`npx playwright install chromium` and run `npm run test:browser`. The command starts and
stops its own loopback fixture server. An optional directory argument saves screenshots:
`npm run test:browser -- /absolute/path/to/screenshots`.

## Provenance

Adapted from `waringme/admiral-xwalk` content-fragment at
`3a4d4d6fb6c1820815e2b1a9071560be2f2c6929`, and `waringme/barclays-xwalk`
cards-folder and brand-concierge at `a437c563d3b67f052c5d159d30ac8beb2816767d`.
Both source repositories use Apache-2.0; see [LICENSE](LICENSE).
The extraction modifies deployment configuration, error handling, consent, scoped neutral
styles and documentation. Branded content, logos, fonts, hotlinked assets, importer scripts
and the optional site-wide concierge floating link are deliberately not included.

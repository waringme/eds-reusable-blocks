# Reusable EDS blocks

Portable AEM Edge Delivery Services blocks.
This is a **block library**, not a configured EDS site.

| Block | Capabilities | Setup and authoring |
| --- | --- | --- |
| Content Fragment | Five AEM CF models; feature lists, pods, steps, accordions, tabs, cover tables, media/text and product cards | [README](blocks/content-fragment/README.md) |
| Cards Folder | Author/published folder listings, category, ordering, nested folders and responsive variants | [README](blocks/cards-folder/README.md) |
| Brand Concierge | Page-local SDK/agent loading, explicit deployment configuration and consent | [README](blocks/brand-concierge/README.md) |
| Weather | Live plain-text weather, local Edge Function routing and accessible loading/error states | [README](blocks/weather/README.md) |

## Copy into an EDS project

Copy each desired `blocks/<name>/` directory into the same path in your project.
Let the standard EDS block loader load its JS and CSS. Each stylesheet is self-contained
and scoped; no source site's global tokens, fonts, images or other blocks are needed.
`content-fragment` needs the destination's standard `scripts/aem.js` `getMetadata`;
`brand-concierge` needs its `loadScript`. Do **not** copy a test helper in place of aem.js.
No helper is required by `cards-folder` or `weather`.

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

## Weather block

Copy `blocks/weather/` into your EDS project. Authors supply one optional heading row,
defaulting to "Current local weather". The block fetches once and displays a plain-text
weather summary in an accessible live status region, with loading and error messages.
Its neutral, responsive styles do not require source-site tokens or assets.

Deploy a weather Edge Function separately: the block requests `/weather` on published/author
pages and `http://127.0.0.1:7676/weather` on `localhost` or `127.0.0.1`. The endpoint must
return a successful HTTP response containing non-empty plain text. The function, provider
credentials and location lookup are not bundled. For a different route, configure before
decoration:

```js
window.edsReusableBlocks = {
  ...window.edsReusableBlocks,
  weather: { apiUrl: '/api/weather' },
};
```

See the [Weather README](blocks/weather/README.md) for CORS requirements, theming, authoring,
error handling and copy/paste **component definition, model and filter JSON** for Universal
Editor. The combined registration fragment is [blocks/weather/_weather.json](blocks/weather/_weather.json).

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

The blocks are adapted from Apache-2.0-licensed source material; see [LICENSE](LICENSE).
The extraction modifies deployment configuration, error handling, consent, scoped neutral
styles and documentation. Branded content, logos, fonts, hotlinked assets, importer scripts
and the optional site-wide concierge floating link are deliberately not included.

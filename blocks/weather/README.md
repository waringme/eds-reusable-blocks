# Weather

Displays a heading and current local weather returned as plain text by an Edge Function.
It preserves the source's local/published routing, loading status, success and error states,
and inline Universal Editor heading annotations. There are no JS helper imports, SDKs,
images, fonts or sibling block dependencies.

## Setup and dependencies

Copy this directory to `blocks/weather/` and use the standard EDS block loader for JS/CSS.
**A weather service is required separately.** The source block contains only a client;
no Edge Function implementation or provider credentials are included in this library.
Copying the block does not deploy a weather API.

Without configuration:

- Published/author pages request the same-origin `/weather` route.
- Pages hosted at `localhost` or `127.0.0.1` request `http://127.0.0.1:7676/weather`.
  Start your local Edge Function server on that port and allow the preview origin via CORS.

The endpoint must accept GET with `Accept: text/plain` and return a successful HTTP status
with a non-empty plain-text weather summary. Requests use `cache: 'no-store'`. The trimmed
response is displayed as text, never as HTML. No browser geolocation request or location
parameter is sent; location determination belongs to your weather service.
Keep provider secrets server-side. Configure your EDS routing/proxy to serve the weather
function on `/weather`, or configure an alternative URL before block decoration:

```js
window.edsReusableBlocks = {
  ...window.edsReusableBlocks,
  weather: {
    apiUrl: '/api/weather',
  },
};
```

`apiUrl` overrides both local and published defaults. It accepts a non-empty relative path
or HTTP(S) URL without embedded credentials. For cross-origin endpoints, allow the page's
origin via CORS and use HTTPS on HTTPS pages. Cross-origin cookies are not sent.

The block fetches once per decoration, with no polling or automatic retry.
HTTP errors, network/CORS failures, empty responses and invalid endpoint configuration
produce a visible error and a console error with diagnostic details. On local hosts the
message prompts developers to start the Edge Function server; elsewhere it asks visitors
to try again later. A polite live status region announces loading and results.

## Authoring

Keep one positional single-cell row:

| Weather |
| --- |
| Current local weather |

The heading is optional; missing or blank content uses "Current local weather".
Authors edit the heading, not the fetched summary. No variants or extra author fields
are required. See [the document example](../../examples/blocks.plain.html).

Styles are scoped and neutral, with no source-site global tokens required. Override
`--weather-max-width`, `--weather-border`, `--weather-radius`, `--weather-background`,
`--weather-text` and `--weather-error` to theme it. Standard EDS section wrappers receive
a centered maximum width and responsive gutters; the block also works without wrappers.
Long headings and service responses wrap on mobile, tablet and desktop.

## Copy/paste Universal Editor JSON

Merge the following entries into your existing component assembly. `_weather.json` is the
combined block-local definition/model fragment for projects that aggregate these files.

### Component definition (`component-definition.json`)

```json
{
  "definitions": [
    {
      "title": "Weather",
      "id": "weather",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": {
              "name": "Weather",
              "model": "weather",
              "heading": "Current local weather"
            }
          }
        }
      }
    }
  ]
}
```

### Component model (`component-models.json`)

```json
{
  "models": [
    {
      "id": "weather",
      "fields": [
        {
          "component": "text",
          "valueType": "string",
          "name": "heading",
          "value": "Current local weather",
          "label": "Heading",
          "description": "Heading displayed above the live weather from the Weather Edge Function."
        }
      ]
    }
  ]
}
```

### Component filter (`component-filters.json`)

```json
{
  "filters": [
    { "id": "section", "components": ["weather"] }
  ]
}
```

Append `"weather"` to the **existing section/parent filter's** `components`, retaining
all other IDs. Use your actual parent filter ID if it is not `section`; its
`data-aue-filter` must reference that ID. Do not replace a shared filter with only this block.

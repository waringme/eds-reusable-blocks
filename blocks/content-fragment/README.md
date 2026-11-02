# Content Fragment

Shows a shared AEM Content Fragment in the page's chosen layout. All five renderers and
original display options are retained. Its private CSS
replaces the source's dynamic dependencies on features, highlights, comparison-table,
callout, media-text, accordion and cards styles, so it can coexist with Cards Folder.
Colors and spacing are neutral and destination-configurable.

## Setup

Copy this directory to `blocks/content-fragment/`. The EDS loader must load both JS and CSS;
the destination must supply `getMetadata` from `scripts/aem.js`.
Set configuration before decoration (example values are **not** a working deployment):

```js
window.edsReusableBlocks = {
  ...window.edsReusableBlocks,
  contentFragment: {
    publishHost: 'https://publish.example.com',
    queryNamespace: 'example',
    siteRoot: '/content/example/en',
    connection: 'aemconnection',
  },
};
```

| Setting | Meaning |
| --- | --- |
| `publishHost` | Required HTTPS origin for published/EDS pages; alternatively `aem-publish-host` page metadata. No default host. |
| `queryNamespace` | Required persisted-query namespace; alternatively `aem-query-namespace` metadata. Letters, digits, underscores and hyphens only. |
| `author` | Optional boolean override for author detection, useful for custom domains. Default: an `author-*.adobeaemcloud.com` hostname. Author requests use the current origin and same-origin credentials. |
| `connection` | UE connection name, default `aemconnection`; must match the project's UE connection configuration. |
| `siteRoot` | Optional AEM page root (including language segments) removed from product links on EDS. Without it, the source's single `/content/<site>` prefix removal is retained. Author links retain the AEM path plus `.html`. |

Published requests omit credentials. DAM image references use their publish URL or the
configured host; author references use their author URL or current origin. Visitor query
cache-busting is bucketed to five minutes; author requests use a current timestamp.
All five by-path queries race and the first matching model wins. Model-specific arrays
must be present; Media Text must contain text or an image. Unsupported/malformed fragments
or unavailable queries show a visible failure and log an error. Missing selection shows a
picker prompt. Missing optional images, introduction and footnote produce no empty slots.

### AEM backend prerequisites

`graphql/models.json` is a **model specification**, not an installable package. Create the
11 models with the exact titles, names, field names and types in that file; the titles drive
GraphQL types such as `FeatureModel` and entry fields such as `featureListByPath`.
Use multi-line text with HTML output, image/document content references, page references
for product links, and **multiple typed fragment references** for the lists (not plain
string arrays; AEM's stored type is `string/content-fragment[]`). Set picker roots and
allowed referenced models for your own DAM and site. Cover Levels has three columns;
Cover Comparison has up to four tiers per table, matching `value1` through `value4`.

Enable Content Fragment Models and GraphQL Persistent Queries for your AEM configuration.
Create its GraphQL endpoint. Persist the five supplied `graphql/*-by-path.graphql` queries
under `queryNamespace`, keeping their filenames and GraphQL response field names.
Publish the models, endpoint, persisted queries, fragments, nested fragments and assets.
Configure publish-tier CORS/Dispatcher access and your EDS site's CSP `connect-src` and
`img-src`. Test the actual endpoint and origin; this library does not provision or validate
your backend. Do not install the source site's branded content packages.

## Authoring

Two single-cell rows in order, even if variation is empty:

| Content Fragment (Alternating) |
| --- |
| `/content/dam/example/fragments/features` (link or path) |
| `master` (empty also means master) |

The UE picker writes `fragment` and `fragmentVariation`. Variations are normalized to lower
case with spaces replaced by underscores. Display settings become block classes.

| Model | Output |
| --- | --- |
| Feature List | Boxed feature rows; `alternating`, `pods`, `pods-colours`, `accordion`, `tabs`, or `steps` with optional `arrows` |
| Cover Levels | Three-column comparison table with optional Good to know callout |
| Cover Comparison | Tabs of tier tables; yes/tick means included, x/no/empty means not included |
| Media Text | Copy and optional image; `image-right` reverses desktop placement |
| Product Pod List | Product cards, optional images and AEM page links |

`no-heading` applies to all models. The two tab layouts support Left/Right arrow navigation,
roving focus and labeled panels. Tables scroll horizontally. Layouts stack on mobile,
with three-column pods/products/steps and side-by-side media from 768px.
Nested CF fields retain UE `data-aue-resource`, `data-aue-prop`, type and label annotations.
The product description remains in its editable rich-text wrapper.

Theme with `--content-fragment-accent`, `--content-fragment-text`,
`--content-fragment-heading`, `--content-fragment-border`, `--content-fragment-surface`,
`--content-fragment-width`, `--content-fragment-title-size`,
`--content-fragment-pod-background`, `--content-fragment-pod-1/2/3`,
`--content-fragment-table-heading` and `--content-fragment-callout`.

## Copy/paste Universal Editor JSON

Use the fragments below in your project's existing component JSON assembly. Merge array
entries rather than replacing the entire project files. `_content-fragment.json` combines
the definition and model for projects that aggregate block-local files.
The **page block model below is separate from the AEM DAM fragment models** described above.

### Component definition (`component-definition.json`)

```json
{
  "definitions": [
    {
      "title": "Content Fragment",
      "id": "content-fragment",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": { "name": "Content Fragment", "model": "content-fragment" }
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
      "id": "content-fragment",
      "fields": [
        {
          "component": "aem-content-fragment",
          "valueType": "string",
          "name": "fragment",
          "label": "Content fragment",
          "description": "A Feature List, Cover Levels, Cover Comparison, Media Text or Product Pod List fragment under your DAM folder",
          "rootPath": "/content/dam",
          "required": true,
          "variationName": "fragmentVariation"
        },
        {
          "component": "text",
          "valueType": "string",
          "name": "fragmentVariation",
          "label": "Selected variation",
          "value": "",
          "description": "Stored by the fragment picker; empty means master.",
          "condition": { "==": [{ "var": "__alwaysFalse" }, true] }
        },
        {
          "component": "multiselect",
          "name": "classes",
          "label": "Display",
          "valueType": "string",
          "description": "How this page shows the shared content. Cover Levels and Cover Comparison fragments show as tables, Media Text as an image beside the copy, Product Pod Lists as product cards.",
          "options": [
            { "name": "Alternating (large illustrations)", "value": "alternating" },
            { "name": "Pods", "value": "pods" },
            { "name": "Pods (colours, with icons)", "value": "pods-colours" },
            { "name": "Accordion (Feature List: questions and answers)", "value": "accordion" },
            { "name": "Tabs (Feature List: one tab per feature)", "value": "tabs" },
            { "name": "Numbered steps (Feature List)", "value": "steps" },
            { "name": "Step arrows (with Numbered steps)", "value": "arrows" },
            { "name": "Hide heading", "value": "no-heading" },
            { "name": "Image on the right (Media Text)", "value": "image-right" }
          ]
        }
      ]
    }
  ]
}
```

Narrow `rootPath` to your DAM folder if needed. Keep the hidden variation field and its
position; it is controlled by the picker rather than hand-authored in UE.

### Component filter (`component-filters.json`)

```json
{
  "filters": [
    { "id": "section", "components": ["content-fragment"] }
  ]
}
```

`section` is an example of the **existing parent filter ID**, not a new block-specific
filter to replace your project's section. Append `"content-fragment"` to that filter's
existing `components` array and preserve all other allowed blocks. If your parent uses a
different filter ID, use that ID. The standard section's `data-aue-filter` must reference it.

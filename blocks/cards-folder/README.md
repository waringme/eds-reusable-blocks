# Cards Folder

Builds responsive cards from pages under a chosen folder.
Each card has an optional image, H3 heading, summary and link pinned to its foot.
The stylesheet includes its own card layout: **do not copy or load the source cards block**
or its `--t-*` tokens. The source's branded tiles, fonts and importer are not dependencies.

## Setup and dependencies

Copy this directory to `blocks/cards-folder/` and use the standard EDS loader for JS/CSS.
No aem.js helper import is required.

```js
window.edsReusableBlocks = {
  ...window.edsReusableBlocks,
  cardsFolder: {
    indexPath: '/query-index.json',
    // For language-specific author roots, set both:
    siteRoot: '/content/example/en',
    authorRoot: '/content/example/en',
  },
};
```

`indexPath` defaults to `/query-index.json`. `siteRoot` optionally controls removal of the
AEM prefix from authored folder paths. `authorRoot` controls author API paths; omit it on
published/EDS pages, or set it to `""` to force published behavior. Without configuration,
author mode is detected from a `/content/<site>/...` page path; the same prefix is removed
from folder selections. Do not set an author root globally on published pages.

### Published index

Merge [helix-query.example.yaml](helix-query.example.yaml) into your site's `helix-query.yaml`
(or your existing index setup), preserving other indices and properties. It contains only
fields this block needs: `path` is supplied by EDS; `title`, `description`, `image`,
`lastModified`, `cardTitle`, `cardSummary`, `cardLinkText`, `cardOrder` and `category` are indexed.
The image expression preserves a full URL so cross-origin images are not accidentally
resolved on the wrong site. Preview/publish the child pages after changing their properties.
An unindexed page cannot appear.

The published listing reads up to **2000** index entries. It excludes `/nav`, `/footer`,
`/fragments` and the current page (using its canonical URL when present). It supplements
incomplete entries by fetching page HTML for card metadata, the first heading/long paragraph
and a usable image. Supplement failures are logged and keep available index data; listing
failures show a visible message and log an error. Empty published folders show an empty grid.
`card-order` supplements all matching entries before applying count; newest-first applies
count first. Complete card metadata avoids extra requests.

### AEM author

Direct children use `<author-root><folder>.2.json`; category or nested listings use
`/bin/querybuilder.json`, up to **500** pages. Your author must permit those authenticated
same-origin APIs. Category query values are lowercased: keep AEM category properties lowercase.
The author grid reads `jcr:title`, `jcr:description`, `image`, `card-*`, `category` and
`cq:lastModified`. EDS `media_...` image URLs are ignored on author. Empty author folders
and unset selections show distinct prompts so the block remains selectable.

## Authoring

Keep three positional single-cell rows, including an empty category row:

| Cards Folder (Card Order, Three Up) |
| --- |
| `/products` or `/content/example/products` (link or path starting with `/`) |
| `6` (default; non-whole-number text uses the default, 0 becomes 1) |
| `featured` (optional; empty means no filter) |

Counts beyond JavaScript's safe integer range are rejected with a visible error.
Absolute external URLs are not folder selections. `/content/<site>` and `.html` are removed
from page-picker values; configure `siteRoot` for deeper roots.

| Class | Behavior |
| --- | --- |
| `card-order` | Lowest Card order first (including 0); missing order is 999, ties sort by title |
| `include-subfolders` | Include descendants, excluding pages that are parents of other matching pages |
| `three-up` / `four-up` | Three/four per row from 960px; default is two from 640px and one on mobile |
| `small-titles` | Smaller card headings |
| `centered` | Centered, unboxed tiles with underlined links, no chevrons |

Without a category or nested option, only direct children are listed. Category matches
ignore case on published pages and include matches at any depth; category-only listings
include folder landing pages. The current page is always excluded.

Edit **child page properties**, not the rendered cards: Card title (`card-title`), Card summary
(`card-summary`), Card link text (`card-link-text`), Card order (`card-order`), Category
(`category`) and Image (`image`). Empty values fall back to page title (dropping a trailing
site-name suffix), description and usable social/first image. Link text defaults to
"Find out more". Images are decorative (`alt=""`) and failed images remove their media slot.
Same-origin EDS media images use 750px WebP with PNG/JPG fallback.

Theme with `--cards-folder-gap`, `--cards-folder-padding`, `--cards-folder-radius`,
`--cards-folder-background`, `--cards-folder-text`, `--cards-folder-heading`,
`--cards-folder-title-size`, `--cards-folder-font-size`, `--cards-folder-link`
and `--cards-folder-border`.

## Copy/paste Universal Editor JSON

Merge these entries into your project's component assembly; do not replace existing arrays.
`_cards-folder.json` is the combined block-local definition/model for aggregating projects.

### Component definition (`component-definition.json`)

```json
{
  "definitions": [
    {
      "title": "Cards Folder",
      "id": "cards-folder",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": { "name": "Cards Folder", "model": "cards-folder", "count": 6 }
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
      "id": "cards-folder",
      "fields": [
        {
          "component": "aem-content",
          "valueType": "string",
          "name": "folder",
          "label": "Folder",
          "description": "Pick a folder: one card per page directly inside it (this page excluded). Each card uses the page's Card title, Card summary, Card link text and Image properties, falling back to its title, description and first image."
        },
        { "component": "number", "valueType": "number", "name": "count", "label": "Number of cards", "value": 6 },
        {
          "component": "text",
          "valueType": "string",
          "name": "category",
          "label": "Category filter",
          "value": "",
          "description": "Optional: only pages with this Category page property, from anywhere under the folder"
        },
        {
          "component": "multiselect",
          "name": "classes",
          "label": "Style",
          "valueType": "string",
          "options": [
            { "name": "Sort by Card order (default: latest first)", "value": "card-order" },
            { "name": "Include sub-folders (their pages, not the folder pages)", "value": "include-subfolders" },
            { "name": "Three per row", "value": "three-up" },
            { "name": "Four per row", "value": "four-up" },
            { "name": "Smaller titles", "value": "small-titles" },
            { "name": "Centred, no box (title, text, underlined link)", "value": "centered" }
          ]
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
    { "id": "section", "components": ["cards-folder"] }
  ]
}
```

Append `"cards-folder"` to the **existing section/parent filter's** `components`, keeping
its other IDs. Substitute your actual parent filter ID if it is not `section`. Its
`data-aue-filter` must reference that ID. Do not replace a shared section filter with only
this block.

### Child page metadata fields

Append these fields to your existing `page-metadata` model (keep its title/description and
other fields). If Image already exists, reuse it rather than adding a duplicate.
The destination's existing page-metadata pipeline must emit the corresponding head meta
tags used by the index; this library does not replace that pipeline.

```json
{
  "models": [
    {
      "id": "page-metadata",
      "fields": [
        { "component": "reference", "valueType": "string", "name": "image", "label": "Image (social + card image)", "multi": false },
        { "component": "text", "valueType": "string", "name": "card-title", "label": "Card title" },
        { "component": "text", "valueType": "string", "name": "card-summary", "label": "Card summary" },
        { "component": "text", "valueType": "string", "name": "card-link-text", "label": "Card link text" },
        { "component": "number", "valueType": "number", "name": "card-order", "label": "Card order" },
        { "component": "text", "valueType": "string", "name": "category", "label": "Category" }
      ]
    }
  ]
}
```

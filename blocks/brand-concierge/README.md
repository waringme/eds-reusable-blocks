# Brand Concierge

Page-local Adobe Experience Platform Brand Concierge integration, adapted from Barclays.
Loads Adobe Web SDK 2.35.1 and the agent only after required configuration and explicit
consent. No Barclays datastream/org IDs, fonts, logos, hotlinked assets or links are defaults.
The supplied `style-config.json` is a **neutral example**, not a validated service export.

## Setup

Copy this directory to `blocks/brand-concierge/`. The destination's standard `scripts/aem.js`
must provide `loadScript`; the EDS loader supplies the block's JS and CSS.
Set settings before decoration; replace placeholders with your provisioned environment:

```js
window.edsReusableBlocks = {
  ...window.edsReusableBlocks,
  brandConcierge: {
    datastreamId: 'YOUR_DATASTREAM_ID',
    orgId: 'YOUR_IMS_ORG_ID@AdobeOrg',
    region: 'YOUR_CONVERSATION_REGION',
    consent: 'pending',
    debugEnabled: false,
    styleConfigUrl: '/blocks/brand-concierge/style-config.json',
  },
};
```

The first three values can instead be authored in the block; non-empty authored values
override global settings. Empty fields use configured global settings, **never source IDs**.
`styleConfigUrl` defaults to the file in this block under `window.hlx.codeBasePath`.
Alternatively provide the approved object as `stylingConfigurations`. Styling failures are
not swallowed; they show a visible unavailable status and log the reason.

### Consent and shared Web SDK

Do not set `consent: "in"` until your site's consent manager has granted the appropriate
purpose. Missing, pending or out consent prevents **all** styling fetches and external script
loads. After consent is granted, set `window.edsReusableBlocks.brandConcierge.consent = "in"`
and call this block's default `decorate(blockElement)` again. Authored field values are
retained across that retry. This library does not implement a consent banner.

On a newly created SDK instance, `defaultConsent` is `"pending"`, debug is false unless
explicitly enabled, and third-party cookies and ID migration are disabled. The block awaits
SDK loading and configuration, applies Adobe general consent, then sends its initial event.
Only after those commands resolve does it load the agent and bootstrap it.

If Launch or your site already owns a configured SDK instance, set
`useExistingInstance: true` and `instanceName: "yourExistingInstance"` (default name: `alloy`).
The instance must already be configured for the correct datastream, org and conversation
region. The block skips SDK loading/configuration but applies consent and sends the initial
event. An existing instance without explicit reuse is an error, not silently reconfigured.
This avoids loading a second SDK or configuring a shared instance twice.

After startup, the site's CMP must manage subsequent revocation directly with the owning
Web SDK's `setConsent` and stop/tear down the agent using the supported SDK integration;
changing this settings object alone does not revoke consent or stop a running agent.
Implement and verify that lifecycle in your destination before go-live.

One agent is allowed per page, including simultaneous block decoration. Additional blocks
show an "already loading or active" message, without duplicate mount IDs. A failed partial
SDK startup requires a page reload to retry safely. The block shows unavailable status and
logs errors rather than claiming conversations work.

### Deployment prerequisites

Provision Brand Concierge in the correct AEP sandbox, enable it on your datastream, choose
the correct conversation region and allow your preview/live/production domains.
Replace the example styling file with your approved Brand Concierge export, including
privacy notice, terms, prompts, assets and theme. Company icons must be inline SVG, not
hotlinked logo URLs. Host any image assets yourself. Test the actual conversations on an
allowed domain: successful front-end bootstrap is **not** proof the datastream is configured.
The source setup reported conversation errors; those services were not verified here.

Review CSP for `cdn1.adoberesources.net` (SDK scripts), `experience.adobe.net` (agent scripts),
`edge.adobedc.net` (Edge/Conversation requests), plus any hosts in your approved export.
Do not assume a particular nonce or `strict-dynamic` policy exists in the destination.
Theme the local status via `--brand-concierge-text`; the agent uses its exported theme.

## Authoring

Three single-cell rows, in this exact order:

| Brand Concierge |
| --- |
| Datastream ID (empty uses configured global value) |
| IMS organisation ID (empty uses configured global value) |
| Conversation region (empty uses configured global value) |

All three must be supplied by authoring or deployment configuration. The block replaces
its rows with status text until it can load, then `#brand-concierge-mount`.
It can sit under an ordinary heading/intro and does not require a specific page path.

**Optional floating link:** the source site's `scripts/scripts.js`/global CSS adds a link on
other pages and a page property for hiding it. That is **not block behavior and is not
included here**. If desired, implement a destination-specific navigation link, respecting
your page paths, UI, accessibility and consent policy; no SDK should load just for that link.
The snippets below intentionally do not add the source's floating-link page property.

## Copy/paste Universal Editor JSON

Merge these entries into your project's component assembly; preserve other definitions,
models and allowed components. `_brand-concierge.json` is the combined block-local source
for projects that aggregate block JSON. IDs below are blank by design.

### Component definition (`component-definition.json`)

```json
{
  "definitions": [
    {
      "title": "Brand Concierge",
      "id": "brand-concierge",
      "plugins": {
        "xwalk": {
          "page": {
            "resourceType": "core/franklin/components/block/v1/block",
            "template": { "name": "Brand Concierge", "model": "brand-concierge" }
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
      "id": "brand-concierge",
      "fields": [
        {
          "component": "text",
          "valueType": "string",
          "name": "datastreamId",
          "label": "Datastream ID",
          "value": "",
          "description": "Adobe Experience Platform datastream configured for Brand Concierge"
        },
        { "component": "text", "valueType": "string", "name": "orgId", "label": "IMS organisation ID", "value": "" },
        { "component": "text", "valueType": "string", "name": "region", "label": "Conversation region", "value": "" }
      ]
    }
  ]
}
```

### Component filter (`component-filters.json`)

```json
{
  "filters": [
    { "id": "section", "components": ["brand-concierge"] }
  ]
}
```

Append `"brand-concierge"` to the **existing parent/section filter's** `components` array,
keeping other allowed blocks. Use the actual parent filter ID if it differs from `section`;
its `data-aue-filter` must reference that ID. Do not replace a shared filter with only this
entry. No published conversation is provisioned by registering the UE component.

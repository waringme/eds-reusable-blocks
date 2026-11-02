/**
 * Deployment IDs have no defaults.
 * No SDK or agent loads until configuration and explicit consent are supplied.
 */
import { loadScript } from '../../scripts/aem.js';

const ALLOY_SRC = 'https://cdn1.adoberesources.net/alloy/2.35.1/alloy.min.js';
const AGENT_SRC = 'https://experience.adobe.net/solutions/experience-platform-brand-concierge-web-agent/static-assets/main.js';
const FIELDS = ['datastreamId', 'orgId', 'region'];
let startup;
let activeBlock;
const authoredFields = new WeakMap();

function installQueue(name) {
  (window.__alloyNS = window.__alloyNS || []).push(name);
  window[name] = (...args) => new Promise((resolve, reject) => {
    window[name].q.push([resolve, reject, args]);
  });
  window[name].q = [];
}

function readConfig(block) {
  const config = { ...window.edsReusableBlocks?.brandConcierge };
  if (!authoredFields.has(block)) {
    authoredFields.set(block, [...block.children].slice(0, FIELDS.length)
      .map((row) => row.textContent.trim()));
  }
  authoredFields.get(block).forEach((value, i) => {
    if (value) config[FIELDS[i]] = value;
  });
  return config;
}

function status(block, text) {
  const p = document.createElement('p');
  p.className = 'brand-concierge-status';
  p.setAttribute('role', 'status');
  p.textContent = text;
  block.replaceChildren(p);
}

async function start(block, config) {
  const name = config.instanceName || 'alloy';
  const base = window.hlx?.codeBasePath || '';
  let styling = config.stylingConfigurations;
  if (!styling) {
    const response = await fetch(config.styleConfigUrl
      || `${base}/blocks/brand-concierge/style-config.json`);
    if (!response.ok) throw new Error(`${response.status} loading Brand Concierge styling`);
    styling = await response.json();
  }
  if (!styling || typeof styling !== 'object' || Array.isArray(styling)) {
    throw new Error('Brand Concierge styling must be a configuration object');
  }
  if (config.useExistingInstance) {
    if (typeof window[name] !== 'function') throw new Error(`Web SDK instance ${name} is missing`);
  } else {
    if (window[name]) {
      throw new Error(`Web SDK instance ${name} already exists; useExistingInstance must be explicit`);
    }
    installQueue(name);
    try {
      await loadScript(ALLOY_SRC);
      await window[name]('configure', {
        defaultConsent: 'pending',
        edgeDomain: 'edge.adobedc.net',
        edgeBasePath: 'ee',
        datastreamId: config.datastreamId,
        orgId: config.orgId,
        debugEnabled: config.debugEnabled === true,
        idMigrationEnabled: false,
        thirdPartyCookiesEnabled: false,
        conversation: { region: config.region },
      });
    } catch (error) {
      // A failed queue cannot safely be reused as a configured SDK.
      throw new Error(`Could not configure Web SDK instance ${name}`, { cause: error });
    }
  }
  await window[name]('setConsent', {
    consent: [{ standard: 'Adobe', version: '1.0', value: { general: 'in' } }],
  });
  await window[name]('sendEvent', {});
  await loadScript(AGENT_SRC);
  if (typeof window.adobe?.concierge?.bootstrap !== 'function') {
    throw new Error('Brand Concierge script did not expose bootstrap');
  }
  const mount = document.createElement('div');
  mount.id = 'brand-concierge-mount';
  block.replaceChildren(mount);
  await window.adobe.concierge.bootstrap({
    instanceName: name,
    stylingConfigurations: styling,
    selector: `#${mount.id}`,
    stickySession: false,
  });
  window.adobe.concierge.booted = true;
}

export default async function decorate(block) {
  if (!startup && window.adobe?.concierge?.booted) {
    status(block, 'Brand Concierge is already active elsewhere on this page.');
    return;
  }
  if (startup) {
    if (block === activeBlock) return startup;
    status(block, 'Brand Concierge is already loading or active elsewhere on this page.');
    return;
  }
  const config = readConfig(block);
  if (FIELDS.some((field) => !config[field])) {
    status(block, 'Configure the Brand Concierge datastream, IMS organisation and conversation region.');
    return;
  }
  if (config.consent !== 'in') {
    status(block, 'Brand Concierge requires your consent before it can load.');
    return;
  }
  status(block, 'Loading Brand Concierge...');
  activeBlock = block;
  startup = start(block, config).catch((error) => {
    status(block, 'Brand Concierge is not available right now. Please try again later.');
    console.error('Brand Concierge failed to load', error);
    // Retrying a partly configured SDK requires a page reload, not another configure command.
  });
  await startup;
}

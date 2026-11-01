import { readFile } from 'node:fs/promises';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';
import { JSDOM } from 'jsdom';

export async function fixture(name) {
  return JSON.parse(await readFile(new URL(`fixtures/${name}.json`, import.meta.url), 'utf8'));
}

export async function environment(name, {
  url = 'https://example.test/products/current',
  settings = {},
  fetch = async () => { throw new Error('Unexpected network request'); },
  loadScript = async () => { throw new Error('Unexpected script load'); },
} = {}) {
  const dom = new JSDOM('<!doctype html><html><head></head><body><main></main></body></html>', { url });
  const { window } = dom;
  window.hlx = { codeBasePath: '' };
  window.edsReusableBlocks = settings;
  const logs = [];
  const context = createContext({
    window,
    document: window.document,
    DOMParser: window.DOMParser,
    URL,
    URLSearchParams,
    fetch,
    console: {
      error: (...args) => logs.push(args),
      warn: (...args) => logs.push(args),
    },
  });
  const helper = new SyntheticModule(['getMetadata', 'loadScript'], function exports() {
    this.setExport('getMetadata', (key) => window.document.querySelector(`meta[name="${key}"]`)?.content || '');
    this.setExport('loadScript', loadScript);
  }, { context });
  const source = await readFile(new URL(`../blocks/${name}/${name}.js`, import.meta.url), 'utf8');
  const module = new SourceTextModule(source, { context });
  await module.link((specifier) => {
    if (specifier !== '../../scripts/aem.js') throw new Error(`Unexpected import ${specifier}`);
    return helper;
  });
  await module.evaluate();
  return { window, logs, decorate: module.namespace.default, close: () => window.close() };
}

export function block(window, name, values, classes = '') {
  const element = window.document.createElement('div');
  element.className = `${name} ${classes}`;
  values.forEach((value) => {
    const row = window.document.createElement('div');
    const cell = window.document.createElement('div');
    cell.textContent = value;
    row.append(cell);
    element.append(row);
  });
  window.document.querySelector('main').append(element);
  return element;
}

export const json = (data) => ({ ok: true, json: async () => data });

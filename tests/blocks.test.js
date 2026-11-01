import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { block, environment, fixture, json } from './helpers.js';

const fragments = await fixture('fragments');
const index = await fixture('query-index');
const cfSettings = { contentFragment: { publishHost: 'https://publish.example.test', queryNamespace: 'example' } };
const fields = {
  'feature-list': 'featureListByPath',
  'cover-levels': 'coverLevelsByPath',
  'media-text': 'mediaTextByPath',
  'product-pod-list': 'productPodListByPath',
  'cover-comparison': 'coverComparisonByPath',
};

function fragmentFetch(type, item, requests = []) {
  return async (url, options) => {
    requests.push({ url, options });
    return json({ data: { [fields[type]]: { item: url.includes(`${type}-by-path`) ? item : null } } });
  };
}

for (const [type, selector] of Object.entries({
  'feature-list': '.feature',
  'cover-levels': 'tbody tr',
  'media-text': '.media-text-copy',
  'product-pod-list': '.pod',
  'cover-comparison': '[role="tab"]',
})) {
  test(`content-fragment renders ${type} without sibling styles`, async () => {
    const requests = [];
    const env = await environment('content-fragment', {
      settings: cfSettings,
      fetch: fragmentFetch(type, fragments[type], requests),
    });
    const element = block(env.window, 'content-fragment', [fragments[type]._path, 'master']);
    await env.decorate(element);
    assert.ok(element.querySelector(selector));
    assert.equal(env.logs.length, 0);
    assert.equal(requests.length, 5);
    assert.ok(requests.every(({ url, options }) => url.startsWith('https://publish.example.test/graphql/execute.json/example/')
      && options.credentials === 'omit'));
    if (type === 'product-pod-list') assert.equal(element.querySelector('a').getAttribute('href'), '/products/one');
    env.close();
  });
}

for (const [classes, selector] of [
  ['alternating', '.features.alternating .feature-icon'],
  ['pods', '.highlights .highlight'],
  ['pods-colours', '.highlights.colours .highlight-icon'],
  ['accordion', 'details > summary'],
  ['tabs', '[role="tab"]'],
  ['steps', '.features.steps'],
  ['steps arrows', '.features.steps.arrows'],
]) {
  test(`content-fragment preserves ${classes}`, async () => {
    const env = await environment('content-fragment', {
      settings: cfSettings, fetch: fragmentFetch('feature-list', fragments['feature-list']),
    });
    const element = block(env.window, 'content-fragment', [fragments['feature-list']._path, ''], classes);
    await env.decorate(element);
    assert.ok(element.querySelector(selector));
    if (classes === 'pods') assert.equal(element.querySelector('picture'), null);
    env.close();
  });
}

test('fragment variation encoding, UE connection, fields and keyboard tabs', async () => {
  const requests = [];
  const env = await environment('content-fragment', {
    url: 'https://author-example.adobeaemcloud.com/content/example/page.html',
    settings: { contentFragment: { queryNamespace: 'custom', connection: 'customconnection' } },
    fetch: fragmentFetch('feature-list', fragments['feature-list'], requests),
  });
  const element = block(env.window, 'content-fragment', ['/content/dam/example/a;b?c#d', 'Campaign A'], 'tabs');
  await env.decorate(element);
  assert.ok(requests[0].url.includes('/graphql/execute.json/custom/'));
  assert.ok(requests[0].url.includes('a%3Bb;variation=campaign_a;'));
  assert.equal(requests[0].options.credentials, 'same-origin');
  assert.match(element.querySelector('.content-fragment-body').dataset.aueResource, /^urn:customconnection:.*\/campaign_a$/);
  assert.ok(element.querySelector('[data-aue-prop="description"]'));
  const tabs = element.querySelectorAll('[role="tab"]');
  const event = new env.window.KeyboardEvent('keydown', { key: 'ArrowRight', cancelable: true });
  tabs[0].dispatchEvent(event);
  assert.equal(event.defaultPrevented, true);
  assert.equal(tabs[1].getAttribute('aria-selected'), 'true');
  assert.equal(env.window.document.activeElement, tabs[1]);
  assert.equal(element.querySelectorAll('[role="tabpanel"]')[0].hidden, true);
  tabs[0].click();
  assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
  env.close();
});

test('media text can omit image and hide heading', async () => {
  const env = await environment('content-fragment', {
    settings: cfSettings,
    fetch: fragmentFetch('media-text', { ...fragments['media-text'], image: null }),
  });
  const element = block(env.window, 'content-fragment', [fragments['media-text']._path, ''], 'image-right no-heading');
  await env.decorate(element);
  assert.ok(element.querySelector('.media-text.image-right'));
  assert.equal(element.querySelector('h2, picture'), null);
  env.close();
});

test('empty CF collection renders and rich text strips executable markup', async () => {
  const env = await environment('content-fragment', {
    settings: cfSettings,
    fetch: fragmentFetch('feature-list', {
      title: 'Empty', features: [], introduction: { html: '<p onclick="bad()">Safe<script>bad()</script><a href="javascript:bad()">Link</a></p>' },
    }),
  });
  const element = block(env.window, 'content-fragment', ['/content/dam/example/empty', '']);
  await env.decorate(element);
  assert.equal(element.querySelectorAll('li').length, 0);
  assert.equal(element.querySelector('script, [onclick], a[href]'), null);
  env.close();
});

test('missing publish configuration shows failure without any network', async () => {
  const env = await environment('content-fragment');
  const element = block(env.window, 'content-fragment', ['/content/dam/example/fragment', '']);
  await env.decorate(element);
  assert.match(element.textContent, /Could not load/);
  assert.equal(env.logs.length, 1);
  env.close();
});

test('invalid fragment URL and non-DAM path do not escape decoration', async () => {
  for (const path of ['http://[', '/content/damage/example']) {
    const env = await environment('content-fragment');
    const element = block(env.window, 'content-fragment', [path, '']);
    await env.decorate(element);
    assert.ok(element.querySelector('.content-fragment-message'));
    env.close();
  }
});

for (const [classes, category, expected] of [
  ['', '', ['Nested folder', 'Product Two', 'One']],
  ['card-order', '', ['Product Two', 'One', 'Nested folder']],
  ['include-subfolders', '', ['Product Two', 'Three', 'One']],
  ['card-order', 'featured', ['Product Two', 'One', 'Three']],
]) {
  test(`cards listing ${classes || 'latest'} category=${category || 'none'}`, async () => {
    const env = await environment('cards-folder', { fetch: async () => json(index) });
    const element = block(env.window, 'cards-folder', ['/products', '6', category], classes);
    await env.decorate(element);
    assert.deepEqual([...element.querySelectorAll('h3')].map((node) => node.textContent), expected);
    assert.equal(env.logs.length, 0);
    assert.ok(!element.textContent.includes('Current page'));
    env.close();
  });
}

test('cards count, custom index URL and existing URL parameters', async () => {
  let request;
  const env = await environment('cards-folder', {
    settings: { cardsFolder: { indexPath: '/custom-index.json?sheet=products' } },
    fetch: async (url) => { request = url; return json(index); },
  });
  const element = block(env.window, 'cards-folder', ['/content/example/products.html', '1', '']);
  await env.decorate(element);
  assert.equal(element.querySelectorAll('.card').length, 1);
  assert.match(request, /sheet=products&limit=2000/);
  env.close();
});

test('card fallback HTML supplies metadata and relative image; failed image removes media', async () => {
  const html = await readFile(new URL('fixtures/page.html', import.meta.url), 'utf8');
  const env = await environment('cards-folder', {
    fetch: async (url) => url.includes('query-index')
      ? json({ data: [{ path: '/products/guide', title: 'Guide' }] })
      : { ok: true, text: async () => html },
  });
  const element = block(env.window, 'cards-folder', ['/products', '6', '']);
  await env.decorate(element);
  assert.equal(element.querySelector('h3').textContent, 'Fallback card');
  assert.equal(element.querySelector('a').textContent, 'Read the guide');
  const img = element.querySelector('img');
  assert.equal(img.src, 'https://example.test/products/illustration.svg');
  img.dispatchEvent(new env.window.Event('error'));
  assert.equal(element.querySelector('.card-media'), null);
  env.close();
});

test('author direct children and configured nested site root', async () => {
  let request;
  const env = await environment('cards-folder', {
    url: 'https://author.example.test/content/example/en/products/current.html',
    settings: { cardsFolder: { authorRoot: '/content/example/en', siteRoot: '/content/example/en' } },
    fetch: async (url) => {
      request = url;
      return json({
        one: { 'jcr:primaryType': 'cq:Page', 'jcr:content': { 'jcr:title': 'One', 'jcr:description': 'Description', image: '/content/dam/example/one.svg' } },
        current: { 'jcr:primaryType': 'cq:Page', 'jcr:content': { 'jcr:title': 'Exclude me' } },
      });
    },
  });
  const element = block(env.window, 'cards-folder', ['/content/example/en/products', '6', '']);
  await env.decorate(element);
  assert.equal(request, '/content/example/en/products.2.json');
  assert.equal(element.querySelectorAll('.card').length, 1);
  assert.equal(element.querySelector('a').getAttribute('href'), '/content/example/en/products/one.html');
  env.close();
});

test('author category/deep queries use page properties and leaf filtering', async () => {
  let request;
  const env = await environment('cards-folder', {
    url: 'https://author.example.test/content/example/products/current.html',
    fetch: async (url) => {
      request = url;
      return json({ hits: [
        { 'jcr:path': '/content/example/products/nested', 'jcr:content': { 'jcr:title': 'Parent', 'jcr:description': 'Parent', image: '/content/dam/example/a.svg' } },
        { 'jcr:path': '/content/example/products/nested/one', 'jcr:content': { 'jcr:title': 'Leaf', 'jcr:description': 'Leaf', image: '/content/dam/example/b.svg' } },
      ] });
    },
  });
  const element = block(env.window, 'cards-folder', ['/products', '6', 'featured'], 'include-subfolders');
  await env.decorate(element);
  assert.match(request, /property=jcr%3Acontent%2Fcategory/);
  assert.equal(element.querySelectorAll('.card').length, 1);
  assert.equal(element.querySelector('h3').textContent, 'Leaf');
  env.close();
});

test('cards missing/empty author folder and unavailable published index are distinguishable', async () => {
  const env = await environment('cards-folder', {
    url: 'https://author.example.test/content/example/page.html', fetch: async () => json({}),
  });
  const empty = block(env.window, 'cards-folder', ['', '', '']);
  await env.decorate(empty);
  assert.match(empty.textContent, /Pick a folder/);
  const noPages = block(env.window, 'cards-folder', ['/empty', '', '']);
  await env.decorate(noPages);
  assert.match(noPages.textContent, /No pages found/);
  env.close();
  const published = await environment('cards-folder', { fetch: async () => ({ ok: false, status: 503 }) });
  const failure = block(published.window, 'cards-folder', ['/products', '', '']);
  await published.decorate(failure);
  assert.match(failure.textContent, /Could not load/);
  assert.equal(published.logs.length, 1);
  published.close();
});

const conciergeConfig = { datastreamId: 'example-stream', orgId: 'example@AdobeOrg', region: 'example-region' };

test('concierge missing IDs and ungranted consent load no scripts or data', async () => {
  for (const config of [{}, conciergeConfig, { ...conciergeConfig, consent: 'out' }]) {
    const env = await environment('brand-concierge', { settings: { brandConcierge: config } });
    const element = block(env.window, 'brand-concierge', ['', '', '']);
    await env.decorate(element);
    assert.ok(element.querySelector('[role="status"]'));
    assert.equal(env.logs.length, 0);
    env.close();
  }
});

test('concierge awaits SDK configure/consent before event and bootstraps once', async () => {
  const commands = [];
  const scripts = [];
  let bootstraps = 0;
  let env;
  env = await environment('brand-concierge', {
    settings: { brandConcierge: { ...conciergeConfig, consent: 'in' } },
    fetch: async () => json({ metadata: { brandName: 'Example' } }),
    loadScript: async (url) => {
      scripts.push(url);
      if (url.includes('alloy')) env.window.alloy = async (...args) => { commands.push(args); };
      else env.window.adobe = { concierge: { bootstrap: async (config) => {
        bootstraps += 1;
        assert.equal(config.selector, '#brand-concierge-mount');
        assert.equal(config.stylingConfigurations.metadata.brandName, 'Example');
      } } };
    },
  });
  const first = block(env.window, 'brand-concierge', ['', '', '']);
  const second = block(env.window, 'brand-concierge', ['', '', '']);
  await Promise.all([env.decorate(first), env.decorate(second)]);
  assert.deepEqual(commands.map(([command]) => command), ['configure', 'setConsent', 'sendEvent']);
  assert.equal(commands[0][1].defaultConsent, 'pending');
  assert.equal(commands[0][1].debugEnabled, false);
  assert.equal(scripts.length, 2);
  assert.equal(bootstraps, 1);
  assert.equal(env.window.document.querySelectorAll('#brand-concierge-mount').length, 1);
  assert.match(second.textContent, /already loading or active/);
  assert.equal(env.logs.length, 0);
  env.close();
});

test('concierge supports redecorating untouched rows after CMP consent grant', async () => {
  const config = { ...conciergeConfig };
  const env = await environment('brand-concierge', { settings: { brandConcierge: config } });
  const element = block(env.window, 'brand-concierge', ['', '', '']);
  await env.decorate(element);
  config.consent = 'in';
  await env.decorate(element);
  assert.match(element.textContent, /not available/);
  assert.equal(env.logs.length, 1);
  env.close();
});

test('concierge retains authored IDs across consent-gated decoration', async () => {
  const config = { consent: 'pending' };
  const configured = [];
  let env;
  env = await environment('brand-concierge', {
    settings: { brandConcierge: config },
    fetch: async () => json({ metadata: { brandName: 'Example' } }),
    loadScript: async (url) => {
      if (url.includes('alloy')) env.window.alloy = async (command, value) => {
        if (command === 'configure') configured.push(value);
      };
      else env.window.adobe = { concierge: { bootstrap: async () => {} } };
    },
  });
  const element = block(env.window, 'brand-concierge', ['authored-stream', 'authored@AdobeOrg', 'authored-region']);
  await env.decorate(element);
  assert.match(element.textContent, /consent/);
  config.consent = 'in';
  await env.decorate(element);
  assert.equal(configured[0].datastreamId, 'authored-stream');
  assert.equal(configured[0].orgId, 'authored@AdobeOrg');
  assert.equal(configured[0].conversation.region, 'authored-region');
  assert.ok(element.querySelector('#brand-concierge-mount'));
  env.close();
});

test('concierge does not mount over an agent already booted by the site', async () => {
  const env = await environment('brand-concierge');
  env.window.adobe = { concierge: { booted: true } };
  const element = block(env.window, 'brand-concierge', ['', '', '']);
  await env.decorate(element);
  assert.match(element.textContent, /already active/);
  assert.equal(env.logs.length, 0);
  env.close();
});

test('concierge reuses an explicitly configured SDK; reports styling or script failures', async () => {
  const commands = [];
  let env;
  env = await environment('brand-concierge', {
    settings: { brandConcierge: {
      ...conciergeConfig, consent: 'in', useExistingInstance: true,
      instanceName: 'siteAlloy', stylingConfigurations: { metadata: { brandName: 'Example' } },
    } },
    loadScript: async () => { env.window.adobe = { concierge: { bootstrap: async () => {} } }; },
  });
  env.window.siteAlloy = async (command) => { commands.push(command); };
  await env.decorate(block(env.window, 'brand-concierge', ['', '', '']));
  assert.deepEqual(commands, ['setConsent', 'sendEvent']);
  env.close();
  for (const response of [{ ok: false, status: 404 }, json(null)]) {
    const failure = await environment('brand-concierge', {
      settings: { brandConcierge: { ...conciergeConfig, consent: 'in' } },
      fetch: async () => response,
    });
    const element = block(failure.window, 'brand-concierge', ['', '', '']);
    await failure.decorate(element);
    assert.match(element.textContent, /not available/);
    assert.equal(failure.logs.length, 1);
    failure.close();
  }
});

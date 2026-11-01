import contentFragment from '../blocks/content-fragment/content-fragment.js';
import cardsFolder from '../blocks/cards-folder/cards-folder.js';
import brandConcierge from '../blocks/brand-concierge/brand-concierge.js';

window.previewErrors = [];
const reportError = console.error.bind(console);
console.error = (...args) => {
  window.previewErrors.push(args.map(String).join(' '));
  reportError(...args);
};
window.addEventListener('error', (event) => window.previewErrors.push(event.message));
window.addEventListener('unhandledrejection', (event) => window.previewErrors.push(String(event.reason)));
const fragments = await (await fetch('/tests/fixtures/fragments.json')).json();
function localImages(value) {
  if (!value || typeof value !== 'object') return;
  if (value._path?.endsWith('.svg')) value._publishUrl = `${window.location.origin}/tests/example.svg`;
  Object.values(value).forEach(localImages);
}
localImages(fragments);
const index = await (await fetch('/tests/fixtures/query-index.json')).json();
index.data.push({ path: '/products/four', title: 'Four', description: 'Another choice', image: '/images/four.svg', cardOrder: '3' });
window.hlx = { codeBasePath: '' };
window.edsReusableBlocks = {
  contentFragment: { publishHost: 'https://publish.example.test', queryNamespace: 'example' },
};
const fields = {
  'feature-list': 'featureListByPath',
  'cover-levels': 'coverLevelsByPath',
  'media-text': 'mediaTextByPath',
  'product-pod-list': 'productPodListByPath',
  'cover-comparison': 'coverComparisonByPath',
};
window.fetch = async (url) => {
  if (url.includes('/graphql/execute.json/')) {
    const type = Object.keys(fields).find((key) => url.includes(`${key}-by-path`));
    const path = decodeURIComponent(url.split(';path=')[1]?.split(';variation=')[0]);
    const item = fragments[type]?._path === path ? fragments[type] : null;
    return { ok: true, json: async () => ({ data: { [fields[type]]: { item } } }) };
  }
  if (url.includes('query-index.json')) return { ok: true, json: async () => index };
  throw new Error(`Unexpected fixture fetch: ${url}`);
};

function add(name, values, classes, label) {
  const section = document.createElement('section');
  const heading = document.createElement('h2');
  heading.textContent = label;
  const block = document.createElement('div');
  block.className = `${name} ${classes}`;
  values.forEach((value) => {
    const row = document.createElement('div');
    const cell = document.createElement('div');
    cell.textContent = value;
    row.append(cell);
    block.append(row);
  });
  section.append(heading, block);
  document.querySelector('main').append(section);
  return block;
}

for (const classes of ['', 'alternating', 'pods', 'pods-colours', 'steps arrows', 'accordion', 'tabs']) {
  await contentFragment(add('content-fragment', [fragments['feature-list']._path, ''], classes, `Features: ${classes || 'default'}`));
}
for (const type of ['cover-levels', 'media-text', 'product-pod-list', 'cover-comparison']) {
  await contentFragment(add('content-fragment', [fragments[type]._path, ''], '', type));
}
for (const classes of ['', 'three-up', 'four-up', 'small-titles', 'centered']) {
  await cardsFolder(add('cards-folder', ['/products', '4', ''], `card-order ${classes}`, `Folder: ${classes || 'default'}`));
}
await brandConcierge(add('brand-concierge', ['', '', ''], '', 'Concierge: configuration required (no external calls)'));
window.previewReady = true;

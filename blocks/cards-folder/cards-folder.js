/**
 * Uses source-compatible markup without customer-specific styles or deployment settings.
 * Renders source-compatible markup: ul.cards-list >
 * li.card > .card-media / .card-body / .card-foot.
 *
 * Model (xwalk block, _cards-folder.json) — one single-cell row per field, in this order:
 *   folder    the folder to list (link or path; the /content/<site> prefix and .html are dropped)
 *   count     how many cards (default 6)
 *   category  optional: only pages with that Category property, from anywhere under the folder
 * Style `card-order` sorts by the Card order page property (default: latest first);
 * `include-subfolders` also lists the pages in sub-folders; `three-up` / `four-up` set the
 * cards per row on desktop.
 * Each page becomes a card from its Card title / Card summary / Card link text / Image page
 * properties, falling back to its title, description and first image; the current page is left
 * out. Published pages come from the query index; in the Universal Editor (AEM author) from the
 * folder's child pages. An unset folder shows a prompt in the editor so the block stays selectable.
 */
const settings = () => window.edsReusableBlocks?.cardsFolder || {};
const SETTINGS = ['folder', 'count', 'category'];

/** AEM author (Universal Editor): pages are addressed as /content/<site>/… */
const authorRoot = () => settings().authorRoot
  ?? (window.location.pathname.match(/^\/content\/(?!dam\/)[^/.]+/) || [])[0];

const normalise = (path) => path.replace(/\.html$/, '').replace(/\/$/, '') || '/';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** the site path of an authored link or path: drops the /content/<site> prefix and .html */
function sitePath(raw) {
  const path = normalise(new URL(raw, window.location.href).pathname);
  const root = settings().siteRoot?.replace(/\/$/, '');
  if (root && (path === root || path.startsWith(`${root}/`))) return path.slice(root.length) || '/';
  const m = path.match(/^\/content\/(?!dam\/)[^/]+(\/.*)?$/);
  return m ? m[1] || '/' : path;
}

/** the block's field rows, in model order: folder, count, category (set or empty) */
function readConfig(block) {
  const config = {
    folder: null,
    count: 6,
    category: '',
    order: block.classList.contains('card-order') ? 'card-order' : 'latest',
    deep: block.classList.contains('include-subfolders'),
  };
  [...block.children].slice(0, SETTINGS.length).forEach((row, i) => {
    const a = row.querySelector('a');
    const text = row.textContent.trim();
    if (SETTINGS[i] === 'folder') {
      const raw = a ? a.getAttribute('href') : text;
      if (raw && raw.startsWith('/')) config.folder = sitePath(raw);
      else if (raw) throw new Error('Folder must be an absolute site path beginning with /');
    } else if (SETTINGS[i] === 'count' && /^\d+$/.test(text)) {
      const count = Number(text);
      if (!Number.isSafeInteger(count)) throw new Error('Card count must be a safe whole number');
      config.count = Math.max(1, count);
    } else if (SETTINGS[i] === 'category') {
      config.category = text.toLowerCase();
    }
  });
  return config;
}

/** an image URL this page can show (on author, Edge Delivery media URLs don't exist) */
const usable = (src) => Boolean(src) && !src.startsWith('about:')
  && !/\/default-meta-image\.(png|jpe?g)/.test(src)
  && !(authorRoot() && /\/media_[0-9a-f]+\./.test(src));

function cardPicture(src) {
  const url = new URL(src, window.location.href);
  const picture = document.createElement('picture');
  const img = document.createElement('img');
  img.alt = '';
  img.loading = 'lazy';
  const media = url.origin === window.location.origin && /\/media_/.test(url.pathname);
  if (media && !url.pathname.endsWith('.svg')) {
    const source = document.createElement('source');
    source.type = 'image/webp';
    source.srcset = `${url.pathname}?width=750&format=webply&optimize=medium`;
    picture.append(source);
    const format = url.pathname.endsWith('.png') ? 'png' : 'jpg';
    img.src = `${url.pathname}?width=750&format=${format}&optimize=medium`;
  } else {
    img.src = media ? url.pathname : url.href;
  }
  // an image that fails to load drops its media slot rather than showing a broken icon
  img.addEventListener('error', () => picture.closest('.card-media')?.remove(), { once: true });
  picture.append(img);
  return picture;
}

/** Drop the trailing site name when the page title contains a separator. */
function withoutSiteName(title = '') {
  return title.replace(/\s[|–-]\s[^|–-]+$/, '').trim();
}

function card(entry) {
  const li = el('li', 'card');
  if (usable(entry.image)) {
    const media = el('div', 'card-media');
    media.append(cardPicture(entry.image));
    li.append(media);
  }
  const body = el('div', 'card-body');
  body.append(el('h3', '', entry.cardTitle || withoutSiteName(entry.title)));
  const summary = entry.cardSummary || entry.description;
  if (summary) body.append(el('p', '', summary));
  li.append(body);
  const a = el('a', '', entry.cardLinkText || 'Find out more');
  a.href = entry.href || entry.path;
  const p = el('p');
  p.append(a);
  const foot = el('div', 'card-foot');
  foot.append(p);
  li.append(foot);
  return li;
}

/** fill what the listing lacks from the page itself: its head meta, first heading and image */
async function summarise(entry) {
  if ((entry.cardTitle || entry.title) && (entry.cardSummary || entry.description)
    && usable(entry.image)) return entry;
  const out = { ...entry, image: usable(entry.image) ? entry.image : '' };
  try {
    const resp = await fetch(entry.href || entry.path);
    if (!resp.ok) throw new Error(`${resp.status} loading card page ${entry.href || entry.path}`);
    const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
    const base = new URL(entry.href || entry.path, window.location.origin);
    const local = (src) => {
      const u = new URL(src, base);
      return u.origin === window.location.origin ? `${u.pathname}${u.search}` : u.href;
    };
    const meta = (name) => doc.head.querySelector(`meta[name="${name}"], meta[property="${name}"]`)
      ?.getAttribute('content')?.trim();
    const heading = doc.querySelector('main h1, main h2');
    const para = [...doc.querySelectorAll('main p')]
      .find((n) => n.textContent.trim().length > 30 && !n.querySelector('picture, img'));
    const img = [...doc.querySelectorAll('main img')].find((n) => usable(n.getAttribute('src')));
    out.cardTitle ||= meta('card-title');
    out.cardSummary ||= meta('card-summary');
    out.cardLinkText ||= meta('card-link-text');
    if (out.cardOrder === undefined || out.cardOrder === null || out.cardOrder === '') {
      out.cardOrder = meta('card-order');
    }
    if (!out.title && heading) out.title = heading.textContent.trim();
    out.description ||= meta('description') || para?.textContent.trim();
    const shareImage = usable(meta('og:image')) ? local(meta('og:image')) : '';
    const firstImage = img ? local(img.getAttribute('src')) : '';
    if (!out.image) out.image = authorRoot() ? firstImage || shareImage : shareImage || firstImage;
  } catch (error) {
    console.warn('cards-folder: could not supplement card metadata', entry.path, error);
  }
  return out;
}

const orderValue = (value) => (value !== undefined && value !== null && value !== ''
  && Number.isFinite(Number(value)) ? Number(value) : 999);
const byOrder = (a, b) => orderValue(a.cardOrder) - orderValue(b.cardOrder)
  || String(a.cardTitle || a.title).localeCompare(String(b.cardTitle || b.title));
const byLatest = (a, b) => (Number(b.lastModified) || 0) - (Number(a.lastModified) || 0);

/** pages that are not themselves folders of other listed pages */
const leaves = (pages) => pages
  .filter((e) => !pages.some((o) => o.path.startsWith(`${normalise(e.path)}/`)));

/** published site: the folder's pages from the query index */
async function fromIndex(folder, {
  limit, order, category, deep,
}) {
  const index = new URL(settings().indexPath || '/query-index.json', window.location.origin);
  index.searchParams.set('limit', '2000');
  const resp = await fetch(index.href);
  if (!resp.ok) throw new Error(`${resp.status} loading query index`);
  const { data } = await resp.json();
  if (!Array.isArray(data)) throw new Error('Query index must contain a data array');
  const canonical = document.querySelector('link[rel="canonical"]');
  const here = normalise(canonical ? new URL(canonical.href).pathname : window.location.pathname);
  const prefix = folder === '/' ? '/' : `${folder}/`;
  let pages = data.filter((e) => e.path && e.path.startsWith(prefix) && e.path !== prefix
    && (category || deep || !normalise(e.path).slice(prefix.length).includes('/'))
    && (!category || (e.category || '').toLowerCase() === category)
    && !/^\/(nav|footer|fragments)(\/|$)/.test(e.path));
  if (deep) pages = leaves(pages);
  pages = pages.filter((e) => normalise(e.path) !== here);
  if (order === 'latest') pages = pages.sort(byLatest).slice(0, limit);
  const entries = await Promise.all(pages.map(summarise));
  return order === 'latest' ? entries : entries.sort(byOrder).slice(0, limit);
}

function authorEntry(path, c) {
  return {
    path,
    href: `${path}.html`,
    title: c['jcr:title'] || path.split('/').pop(),
    description: c['jcr:description'],
    image: c.image,
    cardTitle: c['card-title'],
    cardSummary: c['card-summary'],
    cardLinkText: c['card-link-text'],
    cardOrder: c['card-order'],
    category: c.category,
    lastModified: Date.parse(c['cq:lastModified'] || '') / 1000 || 0,
  };
}

/** Universal Editor (AEM author): the folder's child pages and their page properties */
async function fromAuthor(folder, {
  limit, order, category, deep,
}) {
  const root = `${authorRoot()}${folder === '/' ? '' : folder}`;
  const here = normalise(window.location.pathname);
  let pages;
  if (category || deep) {
    const q = new URLSearchParams({
      path: root, type: 'cq:Page', 'p.limit': '500', 'p.hits': 'full', 'p.nodedepth': '1',
    });
    if (category) {
      q.set('property', 'jcr:content/category');
      q.set('property.value', category);
    }
    const resp = await fetch(`/bin/querybuilder.json?${q}`);
    if (!resp.ok) throw new Error(`${resp.status} loading author query`);
    const { hits = [] } = await resp.json();
    pages = hits.filter((h) => h['jcr:content'] && h['jcr:path'] !== root)
      .map((h) => authorEntry(h['jcr:path'], h['jcr:content']));
    if (deep) pages = leaves(pages);
  } else {
    const resp = await fetch(`${root}.2.json`);
    if (!resp.ok) throw new Error(`${resp.status} loading author folder`);
    const json = await resp.json();
    pages = Object.entries(json)
      .filter(([, v]) => v && v['jcr:primaryType'] === 'cq:Page' && v['jcr:content'])
      .map(([name, v]) => authorEntry(`${root}/${name}`, v['jcr:content']));
  }
  pages = pages
    .filter((e) => normalise(e.path) !== here)
    .sort(order === 'latest' ? byLatest : byOrder)
    .slice(0, limit);
  return Promise.all(pages.map(summarise));
}

export default async function decorate(block) {
  block.classList.add('cards');
  block.parentElement?.classList.add('cards-wrapper');
  block.closest('.section')?.classList.add('cards-container');
  const list = el('ul', 'cards-list');
  try {
    const config = readConfig(block);
    block.replaceChildren(list);
    if (!config.folder) {
      if (authorRoot()) list.append(el('li', 'cards-folder-placeholder', 'Pick a folder to show its pages as cards.'));
      return;
    }
    block.dataset.folder = config.folder;
    const opts = {
      limit: config.count, order: config.order, category: config.category, deep: config.deep,
    };
    const entries = authorRoot() ? await fromAuthor(config.folder, opts)
      : await fromIndex(config.folder, opts);
    list.append(...entries.map(card));
    if (!entries.length && authorRoot()) {
      list.append(el('li', 'cards-folder-placeholder', `No pages found in ${config.folder}.`));
    }
  } catch (error) {
    console.error('cards-folder: could not load listing', error);
    const message = el('li', 'cards-folder-placeholder', 'Could not load the page listing.');
    message.setAttribute('role', 'status');
    list.replaceChildren(message);
    block.replaceChildren(list);
  }
}

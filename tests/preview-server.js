import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import process from 'node:process';

const root = new URL('../', import.meta.url);
const helper = `
export const getMetadata = (key) => document.querySelector('meta[name="' + key + '"]')?.content || '';
export const loadScript = async () => { throw new Error('External SDK loads are disabled in this fixture harness'); };
`;
const image = '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="96" viewBox="0 0 180 96"><rect width="180" height="96" rx="12" fill="#e8eef5"/><circle cx="90" cy="48" r="28" fill="#334155"/></svg>';
const types = { html: 'text/html', js: 'text/javascript', css: 'text/css', json: 'application/json' };
const server = createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  try {
    if (path === '/scripts/aem.js') {
      response.writeHead(200, { 'Content-Type': types.js }).end(helper);
      return;
    }
    if (path.endsWith('.svg')) {
      response.writeHead(200, { 'Content-Type': 'image/svg+xml' }).end(image);
      return;
    }
    const files = [
      '/tests/preview.html', '/tests/preview.js', '/tests/responsive.html',
      '/tests/fixtures/fragments.json', '/tests/fixtures/query-index.json',
      '/tests/fixtures/weather.html',
      ...['content-fragment', 'cards-folder', 'brand-concierge', 'weather'].flatMap((name) => [
        `/blocks/${name}/${name}.js`, `/blocks/${name}/${name}.css`,
      ]),
    ];
    if (!files.includes(path)) {
      response.writeHead(404).end('Not a fixture resource');
      return;
    }
    const content = await readFile(new URL(path.slice(1), root));
    response.writeHead(200, { 'Content-Type': types[path.split('.').pop()] }).end(content);
  } catch (error) {
    console.error('Fixture server failed', error);
    response.writeHead(500).end('Fixture server error');
  }
});
server.listen(0, '127.0.0.1', () => {
  console.log(`Fixture preview: http://127.0.0.1:${server.address().port}/tests/responsive.html`);
});
process.on('SIGTERM', () => server.close());

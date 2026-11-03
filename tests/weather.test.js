import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { block, environment } from './helpers.js';

const authoredWeather = await readFile(new URL('fixtures/weather.html', import.meta.url), 'utf8');
const response = (text) => ({ ok: true, text: async () => text });

test('weather preserves authored heading, loading state and accessible plain-text result', async () => {
  let resolve;
  let request;
  const env = await environment('weather', {
    fetch: (url, options) => {
      request = { url, options };
      return new Promise((done) => { resolve = done; });
    },
  });
  env.window.document.querySelector('main').innerHTML = authoredWeather;
  const element = env.window.document.querySelector('.weather');
  const decorating = env.decorate(element);
  assert.equal(element.querySelector('h2').textContent, 'Current local weather');
  assert.equal(element.querySelector('h2').dataset.aueProp, 'heading');
  assert.equal(element.querySelector('h2').dataset.aueLabel, 'Heading');
  assert.equal(element.querySelector('h2').dataset.aueType, 'text');
  const result = element.querySelector('[role="status"]');
  assert.equal(result.getAttribute('aria-live'), 'polite');
  assert.match(result.className, /loading/);
  assert.match(result.textContent, /Loading current weather/);
  resolve(response('  Example town: 18 C <strong>Sunny</strong>  '));
  await decorating;
  assert.equal(request.url, '/weather');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.headers.Accept, 'text/plain');
  assert.equal(result.textContent, 'Example town: 18 C <strong>Sunny</strong>');
  assert.equal(result.querySelector('strong'), null);
  assert.match(result.className, /success/);
  assert.equal(env.logs.length, 0);
  env.close();
});

for (const values of [[], [''], ['   ']]) {
  test(`weather defaults missing heading ${JSON.stringify(values)}`, async () => {
    const env = await environment('weather', { fetch: async () => response('Sunny') });
    const element = block(env.window, 'weather', values);
    await env.decorate(element);
    assert.equal(element.querySelector('h2').textContent, 'Current local weather');
    env.close();
  });
}

for (const hostname of ['localhost', '127.0.0.1']) {
  test(`weather preserves local edge routing for ${hostname}`, async () => {
    let request;
    const env = await environment('weather', {
      url: `http://${hostname}:3000/example`,
      fetch: async (url) => { request = url; return response('Sunny'); },
    });
    const element = block(env.window, 'weather', ['Local forecast']);
    await env.decorate(element);
    assert.equal(request, 'http://127.0.0.1:7676/weather');
    assert.equal(element.querySelector('h2').textContent, 'Local forecast');
    env.close();
  });
}

test('weather allows a configured service on local and published pages', async () => {
  for (const url of ['http://localhost:3000', 'https://example.test']) {
    let request;
    const env = await environment('weather', {
      url,
      settings: { weather: { apiUrl: '/api/weather' } },
      fetch: async (endpoint) => { request = endpoint; return response('Sunny'); },
    });
    await env.decorate(block(env.window, 'weather', ['Forecast']));
    assert.equal(request, new URL('/api/weather', url).href);
    env.close();
  }
});

for (const [label, fetch, detail] of [
  ['HTTP failure', async () => ({ ok: false, status: 503 }), /HTTP 503/],
  ['network failure', async () => { throw new Error('Connection refused'); }, /Connection refused/],
  ['empty result', async () => response(' \n '), /empty response/],
]) {
  for (const url of ['https://example.test', 'http://localhost:3000']) {
    test(`weather reports ${label} on ${url}`, async () => {
      const env = await environment('weather', { url, fetch });
      const element = block(env.window, 'weather', ['Forecast']);
      await env.decorate(element);
      assert.ok(element.querySelector('.weather-result-error'));
      assert.match(element.textContent, url.startsWith('http:') ? /Start the local Edge Function/ : /try again later/);
      assert.equal(env.logs.length, 1);
      assert.match(String(env.logs[0][1]), detail);
      assert.equal(element.querySelector('.weather-result-success'), null);
      env.close();
    });
  }
}

test('weather rejects unsafe or malformed endpoint configuration without fetching', async () => {
  for (const apiUrl of ['javascript:alert(1)', 'http://[', 'https://user:password@example.test/weather', '']) {
    let fetched = false;
    const env = await environment('weather', {
      settings: { weather: { apiUrl } },
      fetch: async () => { fetched = true; return response('Sunny'); },
    });
    const element = block(env.window, 'weather', []);
    await env.decorate(element);
    assert.equal(fetched, false);
    assert.ok(element.querySelector('.weather-result-error'));
    assert.equal(env.logs.length, 1);
    env.close();
  }
});

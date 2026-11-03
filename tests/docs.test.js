import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';

for (const name of ['content-fragment', 'cards-folder', 'brand-concierge', 'weather']) {
  test(`${name} README registration snippets match the canonical block JSON`, async () => {
    const base = new URL(`../blocks/${name}/`, import.meta.url);
    const model = JSON.parse(await readFile(new URL(`_${name}.json`, base), 'utf8'));
    const readme = await readFile(new URL('README.md', base), 'utf8');
    const snippets = [...readme.matchAll(/```json\n([\s\S]*?)\n```/g)]
      .map((match) => JSON.parse(match[1]));
    assert.deepEqual(snippets.find((snippet) => snippet.definitions)?.definitions, model.definitions);
    assert.deepEqual(snippets.find((snippet) => snippet.models)?.models, model.models);
    assert.deepEqual(snippets.find((snippet) => snippet.filters)?.filters,
      [{ id: 'section', components: [name] }]);
    const names = model.models[0].fields.map((field) => field.name);
    assert.equal(new Set(names).size, names.length);
    const source = await readFile(new URL(`${name}.js`, base), 'utf8');
    assert.doesNotMatch(source, /publish-p147324|fe057ec8|BF9C27AA|blocks\/cards\/cards\.css/);
    const css = await readFile(new URL(`${name}.css`, base), 'utf8');
    assert.doesNotMatch(css, /var\(--t-|var\(--col-pad|@import|https?:\/\//);
  });
}

test('cards index example preserves required fields and full image origins', async () => {
  const source = await readFile(new URL('../blocks/cards-folder/helix-query.example.yaml', import.meta.url), 'utf8');
  const index = parse(source).indices.pages;
  assert.equal(index.target, '/query-index.json');
  assert.deepEqual(Object.keys(index.properties), [
    'title', 'description', 'image', 'lastModified', 'cardTitle', 'cardSummary',
    'cardLinkText', 'cardOrder', 'category',
  ]);
  assert.equal(index.properties.image.value, "attribute(el, 'content')");
});

test('CF backend spec includes all eleven compatible models and five queries', async () => {
  const base = new URL('../blocks/content-fragment/graphql/', import.meta.url);
  const specification = JSON.parse(await readFile(new URL('models.json', base), 'utf8'));
  assert.equal(specification.models.length, 11);
  for (const name of ['feature-list', 'cover-levels', 'media-text', 'product-pod-list', 'cover-comparison']) {
    const query = await readFile(new URL(`${name}-by-path.graphql`, base), 'utf8');
    assert.match(query, /\$path: String!/);
    assert.match(query, /\$variation: String = "master"/);
    assert.match(query, /_path: \$path, variation: \$variation/);
    assert.ok(specification.models.find((model) => model.name === name));
  }
});

test('Concierge example styling has no branded identifiers, assets or remote links', async () => {
  const source = await readFile(new URL('../blocks/brand-concierge/style-config.json', import.meta.url), 'utf8');
  const config = JSON.parse(source);
  assert.equal(config.metadata.brandName, 'Example');
  assert.doesNotMatch(source, /fe057ec8|BF9C27AA/i);
  assert.deepEqual(config.arrays['welcome.examples'], []);
  assert.deepEqual(config.disclaimer.links, []);
});

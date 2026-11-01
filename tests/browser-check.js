import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { once } from 'node:events';
import process from 'node:process';
import { join } from 'node:path';
import { chromium } from 'playwright';

const server = spawn(process.execPath, ['tests/preview-server.js'], { stdio: ['ignore', 'pipe', 'inherit'] });
let browser;
try {
  const url = await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.once('exit', (code) => reject(new Error(`Fixture server exited early: ${code}`)));
    server.stdout.on('data', (chunk) => {
      const match = chunk.toString().match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) resolve(`${match[0]}/tests/preview.html`);
    });
  });
  const screenshots = process.argv[2];
  if (screenshots) await mkdir(screenshots, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  for (const width of [360, 768, 1200]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await page.waitForFunction(() => window.previewReady);
    await page.evaluate(async () => {
      const images = [...document.images];
      images.forEach((image) => { image.loading = 'eager'; });
      await Promise.all(images.map((image) => image.decode()));
    });
    const metrics = await page.evaluate(() => {
      const columns = (selector) => {
        const list = document.querySelector(selector);
        const card = list.querySelector('.card');
        return Math.round((list.clientWidth + 24) / (card.getBoundingClientRect().width + 24));
      };
      return {
        defaultColumns: columns('.cards-folder'),
        threeColumns: columns('.cards-folder.three-up'),
        fourColumns: columns('.cards-folder.four-up'),
        podColumns: window.getComputedStyle(document.querySelector('.highlights > ul')).gridTemplateColumns.split(' ').length,
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        failures: document.querySelectorAll('.content-fragment-message').length,
        remoteRequests: window.performance.getEntriesByType('resource')
          .filter((entry) => new URL(entry.name).origin !== window.location.origin).length,
      };
    });
    const defaultColumns = width < 640 ? 1 : 2;
    assert.deepEqual(metrics, {
      defaultColumns,
      threeColumns: width >= 960 ? 3 : defaultColumns,
      fourColumns: width >= 960 ? 4 : defaultColumns,
      podColumns: width >= 768 ? 3 : 1,
      overflow: false,
      failures: 0,
      remoteRequests: 0,
    });
    const tabs = page.locator('.content-fragment.tabs [role="tab"]');
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
    const summary = page.locator('summary').first();
    await summary.click();
    assert.equal(await summary.evaluate((node) => node.parentElement.open), true);
    if (screenshots) {
      await page.locator('.cards-folder.four-up').screenshot({ path: join(screenshots, `cards-${width}.png`) });
      await page.locator('.content-fragment.pods-colours').screenshot({ path: join(screenshots, `fragments-${width}.png`) });
    }
    console.log(`Browser fixture checks passed at ${width}px`);
  }
  assert.deepEqual(errors, []);
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await once(server, 'exit');
}

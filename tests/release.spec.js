const { test, expect } = require('@playwright/test');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

test('release assets bypass the old HEAD URL cache and share one version', async ({ page, baseURL }) => {
  // Capture pre-fix HEAD, not the moving HEAD after this regression is committed.
  const previousRelease = '4ca70d3cacfbb7b77796e0a10492ea1bc4904a80';
  const oldHtml = execFileSync('git', ['show', `${previousRelease}:index.html`], { encoding: 'utf8' });
  const oldCache = new Map([...oldHtml.matchAll(/(?:src|href)="([^"?]+\.(?:js|css)(?:\?[^"\s]*)?)"/g)].map(([, asset]) => [
    new URL(asset, baseURL).href,
    execFileSync('git', ['show', `${previousRelease}:${asset.split('?')[0]}`], { encoding: 'utf8' }),
  ]));
  expect(oldCache.size).toBeGreaterThan(0);
  const cacheHits = [], requests = [], errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/^https:\/\//, route => route.abort());
  // Emulate a still-fresh URL-keyed cache, independent of browser cache heuristics.
  await page.route(`${baseURL}/**`, route => {
    const url = route.request().url();
    if (['script', 'stylesheet'].includes(route.request().resourceType())) requests.push(url);
    if (!oldCache.has(url)) return route.continue();
    cacheHits.push(url);
    return route.fulfill({ body: oldCache.get(url), contentType: new URL(url).pathname.endsWith('.css') ? 'text/css' : 'text/javascript' });
  });
  await page.goto('/');
  expect(cacheHits, 'new HTML must not request any old HEAD runtime URL').toEqual([]);
  const assets = await page.locator('script[src], link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(n => n.src || n.href));
  const local = assets.filter(url => new URL(url).origin === baseURL);
  expect(local.map(url => new URL(url).pathname).sort()).toEqual([
    '/app.js', '/course.js', '/courseware-insights.js', '/i18n.js', '/labs.js', '/locale-data.js', '/questions.js', '/resources.js', '/styles.css',
  ].sort());
  const versions = local.map(url => new URL(url).searchParams.get('v'));
  expect(versions.every(Boolean)).toBe(true);
  expect(new Set(versions).size).toBe(1);
  expect([...new Set(requests)].sort()).toEqual(local.sort());
  expect(errors).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(page.locator('#question-list button')).toHaveCount(90);
  await page.locator('[data-id="60"]').click();
  await expect(page.locator('[data-match]')).toHaveCount(4);
  await expect(page.locator('.source-row a')).not.toHaveAttribute('href', 'undefined');
});

test('browser projects cover all engines while npm test stays Chromium-only', () => {
  const config = require('../playwright.config');
  const { scripts } = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  expect(config.projects?.map(p => [p.name, p.use.browserName])).toEqual([
    ['chromium', 'chromium'], ['firefox', 'firefox'], ['webkit', 'webkit'],
  ]);
  expect(scripts.test).toBe('playwright test --project=chromium');
  expect(scripts['test:all-browsers']).toBe('playwright test');
});

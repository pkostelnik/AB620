import { pathToFileURL } from 'node:url';
import { loadContent } from './load-content.mjs';

// Reachability only: a successful HTTP response does not verify an answer or a page's claims.
export async function checkLinks(urls, request = fetch) {
  const results = [];
  for (const url of new Set(urls)) {
    try {
      let response = await request(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if ([403, 405, 501].includes(response.status)) {
        await response.body?.cancel();
        response = await request(url, { method: 'GET', redirect: 'follow', signal: AbortSignal.timeout(15000) });
      }
      results.push({ url, ok: response.ok, status: response.status, finalUrl: response.url });
      await response.body?.cancel();
    } catch (error) { results.push({ url, ok: false, error: error.message }); }
  }
  return results;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv.includes('--network')) {
    console.error('Opt-in required: pass --network to send HTTP requests to source websites. Add --reviewed for reviewed Microsoft Learn links only.');
    process.exitCode = 2;
  } else {
    const data = loadContent();
    const urls = process.argv.includes('--reviewed')
      ? data.questions.filter(q => q.verifiedOn).map(q => q.verificationSource)
      : [...data.questions.flatMap(q => [q.originalSource, q.verificationSource]), ...data.labs.map(l => l.sourceUrl), ...data.resources.map(r => r.url), ...data.areas.flatMap(a => a.sources), ...data.insights.map(i => i.source)];
    const results = await checkLinks(urls);
    console.log(JSON.stringify({ checkedAt: new Date().toISOString(), scope: process.argv.includes('--reviewed') ? 'reviewed Learn evidence' : 'all content links', results }, null, 2));
    if (results.some(r => !r.ok)) process.exitCode = 1;
  }
}

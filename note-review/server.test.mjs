import test from 'node:test';
import assert from 'node:assert/strict';
import {createReviewServer, reviseWithGemini} from './server.mjs';

const accessCode = 'test-only-access-code-at-least-20';
const options = {apiKey: 'test-key-never-return', model: 'test-model', accessCode};
const mock = async (_url, options) => {
  assert.equal(options.headers['x-goog-api-key'], 'test-key-never-return');
  assert.equal(JSON.parse(options.body).contents[0].parts[0].text, 'deus e bom');
  return Response.json({candidates: [{finishReason: 'STOP', content: {parts: [{text: 'internal', thought: true}, {text: 'Deus é bom.'}]}}]});
};
async function fixture(t, extra = {}) {
  const server = createReviewServer({...options, ...extra});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  return {base, post: (body, headers = {}) => fetch(base + '/api/revisar-nota', {method: 'POST', headers: {'Content-Type': 'application/json', Authorization: 'Bearer ' + accessCode, ...headers}, body: JSON.stringify(body)})};
}
test('health stays available before key setup; reviewing fails closed', async t => {
  const {base, post} = await fixture(t, {apiKey: undefined});
  assert.deepEqual(await (await fetch(base + '/health')).json(), {ok: true, configured: false, provider: 'gemini'});
  assert.equal((await post({text: 'deus e bom'})).status, 503);
});
test('authenticated CORS request revises without returning key or thought', async t => {
  const {post} = await fixture(t, {fetcher: mock});
  const response = await post({text: 'deus e bom'}, {Origin: 'https://localhost'});
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://localhost');
  assert.deepEqual(await response.json(), {text: 'Deus é bom.'});
});
test('rejects unauthorized clients, disallowed origins and oversized text without AI calls', async t => {
  const {post} = await fixture(t, {fetcher: () => {throw Error('Must not call AI');}});
  assert.equal((await post({text: 'x'}, {Authorization: 'Bearer wrong'})).status, 401);
  assert.equal((await post({text: 'x'}, {Origin: 'https://other.example'})).status, 403);
  assert.equal((await post({text: 'x'.repeat(6001)})).status, 400);
  assert.deepEqual(await (await post({check: true})).json(), {connected: true, provider: 'gemini'});
});
test('preflight authorizes only supported origins', async t => {
  const {base} = await fixture(t);
  const response = await fetch(base + '/api/revisar-nota', {method: 'OPTIONS', headers: {Origin: 'https://pulpito-bible.onrender.com'}});
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Headers'), 'authorization, content-type');
});
test('falls back only for unavailable model and rejects truncated results', async () => {
  let calls = 0;
  const text = await reviseWithGemini('deus e bom', {...options, fetcher: (...args) => ++calls === 1 ? Promise.resolve(new Response('', {status: 404})) : mock(...args)});
  assert.equal(calls, 2);
  assert.equal(text, 'Deus é bom.');
  await assert.rejects(reviseWithGemini('x', {...options, fetcher: async () => Response.json({candidates: [{finishReason: 'MAX_TOKENS', content: {parts: [{text: 'Incomplete'}]}}]})}), /interrompida/);
});
test('returns Gemini quota errors without leaking upstream content', async t => {
  const {post} = await fixture(t, {fetcher: async () => new Response('private upstream content', {status: 429})});
  const response = await post({text: 'x'});
  assert.equal(response.status, 429);
  assert.doesNotMatch(await response.text(), /private|test-key/);
});

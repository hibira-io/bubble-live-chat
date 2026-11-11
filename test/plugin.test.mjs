import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { root, readJson, text, load, page } from './bubble.mjs';

const ELEMENT = 'elements/AXA';

test('IDs look like Bubble IDs and are unique', () => {
  const ids = [];
  const add = (o) => Object.keys(o || {}).forEach((k) => ids.push(k));
  add(readJson('shared_tech_params.json').shared_keys);
  ids.push('AXA');
  const el = readJson(`${ELEMENT}/params.json`);
  add(el.fields); add(el.states); add(el.events);
  for (const a of fs.readdirSync(path.join(root, ELEMENT, 'element_actions'))) {
    ids.push(a);
    add(readJson(`${ELEMENT}/element_actions/${a}/params.json`).fields);
  }
  for (const a of fs.readdirSync(path.join(root, 'actions'))) {
    ids.push(a);
    const p = readJson(`actions/${a}/params.json`);
    add(p.fields); add(p.return_value);
  }
  ids.forEach((id) => assert.match(id, /^A[A-Za-z0-9]{2}$/));
  assert.equal(new Set(ids).size, ids.length);
});

test('every JS file compiles as a Bubble function', () => {
  const files = [];
  const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).forEach((e) => {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) walk(rel);
    else if (e.name.endsWith('.js')) files.push(rel);
  });
  walk('elements'); walk('actions');
  files.forEach((f) => assert.equal(typeof load(f), 'function', f));
});

test('the element uses its fields, states, events and only real plugin keys', () => {
  const p = readJson(`${ELEMENT}/params.json`);
  const update = text(`${ELEMENT}/update.js`);
  Object.values(p.fields).forEach((f) => assert.ok(update.includes(`properties.${f.name}`), f.name));
  const code = ['initialize.js', 'update.js', ...fs.readdirSync(path.join(root, ELEMENT, 'element_actions')).map((a) => `element_actions/${a}/run.js`)]
    .map((f) => text(`${ELEMENT}/${f}`)).join('\n');
  const states = new Set([...code.matchAll(/publishState\('([a-z_]+)'/g)].map((m) => m[1]));
  const events = new Set([...code.matchAll(/triggerEvent\('([a-z_]+)'/g)].map((m) => m[1]));
  assert.deepEqual([...states].sort(), Object.values(p.states).map((s) => s.name).sort());
  assert.deepEqual([...events].sort(), Object.values(p.events).map((e) => e.name).sort());
  const captions = Object.values(readJson('shared_tech_params.json').shared_keys).map((k) => k.caption);
  for (const f of [`${ELEMENT}/update.js`, 'actions/AYA/server.js']) {
    for (const m of text(f).matchAll(/keys \|\| \{\}\)\['([^']+)'\]|keys\['([^']+)'\]/g)) assert.ok(captions.includes(m[1] || m[2]), m[0]);
  }
  for (const a of fs.readdirSync(path.join(root, ELEMENT, 'element_actions'))) {
    const fields = Object.values(readJson(`${ELEMENT}/element_actions/${a}/params.json`).fields).map((f) => f.name);
    const used = new Set([...text(`${ELEMENT}/element_actions/${a}/run.js`).matchAll(/properties\.([a-z_]+)/g)].map((m) => m[1]));
    assert.deepEqual([...used].sort(), [...fields].sort(), a);
  }
});

test('the header loads the chat once with the element options', () => {
  const pg = page();
  const chat = pg.window.HibiraBubbleChat;
  assert.match(chat.load({ workspace: '' }), /Workspace ID/);
  assert.match(chat.load({ workspace: 'ws_"x' }), /Workspace ID/);
  assert.equal(pg.added.length, 0);
  assert.equal(chat.load({ workspace: ' ws_abc ', color: '#e5484d', language: 'zh-TW', show_button: false }), '');
  assert.equal(chat.load({ workspace: 'ws_other' }), '');
  assert.equal(pg.added.length, 1);
  const s = pg.added[0];
  assert.equal(s.src, 'https://chat.hibira.io/w/v1.js');
  assert.equal(s.async, true);
  assert.deepEqual({ ...s.attrs }, { 'data-workspace': 'ws_abc', 'data-color': '#e5484d', 'data-lang': 'zh-TW', 'data-launcher': 'none' });
  assert.deepEqual({ ...chat.attributes({ workspace: 'ws_a', color: 'red;x', language: '<b>', show_button: true }) }, { 'data-workspace': 'ws_a' });
});

test('actions wait for the chat, then run', () => {
  const pg = page();
  const chat = pg.window.HibiraBubbleChat;
  const calls = [];
  const events = [];
  chat.onChange((e) => events.push(e));
  chat.open('sales');
  chat.identify({ id: 'u1', hash: 'h' });
  assert.equal(calls.length, 0);
  pg.window.HibiraLiveChat = {
    open: (o) => calls.push(['open', o]),
    close: () => calls.push(['close']),
    identify: (u) => calls.push(['identify', u.id]),
    logout: () => calls.push(['logout'])
  };
  pg.window.dispatch('hibira-livechat:ready');
  assert.ok(chat.isReady());
  assert.deepEqual([...events], ['']);
  chat.close();
  chat.forget();
  chat.open('');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['open', { topic: 'sales' }], ['identify', 'u1'], ['close'], ['logout'], ['open', null]]);
});

test('Sign user makes the hash pusher-server checks', async () => {
  const run = load('actions/AYA/server.js');
  const r = await run({ user_id: '1700000000x42' }, { keys: { 'Identity secret': 'lcid_test' } });
  assert.deepEqual(r, { user_hash: crypto.createHmac('sha256', 'lcid_test').update('1700000000x42').digest('hex'), error: '' });
  assert.match((await run({ user_id: 'u' }, { keys: {} })).error, /identity secret/);
  assert.match((await run({ user_id: ' ' }, { keys: { 'Identity secret': 's' } })).error, /User ID/);
});

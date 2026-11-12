// Loads the plugin's Bubble files the way Bubble runs them.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

export const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const require = createRequire(import.meta.url);

export function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
}

export function text(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

// Compiles a Bubble function file (a bare "function(...) {}" expression).
export function load(rel, scope = {}) {
  return new Function('require', 'window', `return (${text(rel)});`)(require, scope.window);
}

// A page with the element's header run in it: a fake window and document
// that record the script tag the runtime adds.
export function page() {
  const listeners = {};
  const added = [];
  const window = {
    addEventListener: (name, fn) => { (listeners[name] = listeners[name] || []).push(fn); },
    dispatch: (name) => (listeners[name] || []).forEach((fn) => fn())
  };
  const document = {
    createElement: () => {
      const attrs = {};
      return { attrs, setAttribute: (k, v) => { attrs[k] = String(v); } };
    },
    body: { appendChild: (el) => added.push(el) }
  };
  const src = text('elements/AXA/headers.html').replace(/^<script>|<\/script>\s*$/g, '');
  vm.runInNewContext(src, { window, document });
  return { window, document, added };
}

// A tiny headless-Chrome driver over the DevTools protocol, using Node 22's built-in WebSocket.
// It launches Chrome, opens one page, and offers goto / evaluate / waitFor / key / mouse /
// screenshot, collecting console errors and uncaught exceptions as it goes.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

export async function launchChrome({ width = 1280, height = 800 } = {}) {
  const profile = mkdtempSync(join(tmpdir(), 'stitch-chrome-'));
  const proc = spawn(CHROME, [
    '--headless=new',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--no-first-run',
    '--hide-scrollbars',
    '--mute-audio',
    'about:blank',
  ]);
  const wsUrl = await new Promise((resolve, reject) => {
    let text = '';
    const timer = setTimeout(() => reject(new Error('Chrome did not start')), 15000);
    proc.stderr.on('data', (chunk) => {
      text += chunk;
      const match = text.match(/DevTools listening on (ws:\/\/\S+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let nextId = 0;
  const pending = new Map();
  const listeners = [];
  ws.onmessage = (message) => {
    const msg = JSON.parse(message.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message}`));
      else resolve(msg.result);
    } else for (const fn of listeners) fn(msg);
  };
  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  const errors = [];
  let loaded = null;
  listeners.push((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.method === 'Runtime.exceptionThrown') errors.push(msg.params.exceptionDetails.exception?.description ?? msg.params.exceptionDetails.text);
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') errors.push(msg.params.args.map((a) => a.value ?? a.description).join(' '));
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') errors.push(`${msg.params.entry.text} ${msg.params.entry.url ?? ''}`);
    if (msg.method === 'Page.loadEventFired' && loaded) loaded();
  });
  await page('Page.enable');
  await page('Runtime.enable');
  await page('Log.enable');
  await page('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

  const KEYS = { Space: [' ', 32], Enter: ['Enter', 13], Escape: ['Escape', 27], KeyP: ['p', 80], KeyR: ['r', 82], KeyM: ['m', 77], KeyW: ['w', 87], KeyA: ['a', 65], KeyS: ['s', 83], KeyD: ['d', 68], Digit1: ['1', 49], Digit2: ['2', 50], Digit3: ['3', 51] };

  const api = {
    errors,
    page,
    async goto(url) {
      const done = new Promise((resolve) => {
        loaded = resolve;
      });
      await page('Page.navigate', { url });
      await done;
    },
    async evaluate(expression) {
      const result = await page('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    },
    async waitFor(expression, timeout = 20000) {
      const start = Date.now();
      while (Date.now() - start < timeout) {
        if (await api.evaluate(expression)) return true;
        await new Promise((r) => setTimeout(r, 50));
      }
      throw new Error(`timed out waiting for ${expression}`);
    },
    async key(code, type = 'press') {
      const [key, vk] = KEYS[code] ?? [code, 0];
      if (type === 'down' || type === 'press') await page('Input.dispatchKeyEvent', { type: 'keyDown', code, key, windowsVirtualKeyCode: vk });
      if (type === 'up' || type === 'press') await page('Input.dispatchKeyEvent', { type: 'keyUp', code, key, windowsVirtualKeyCode: vk });
    },
    async mouse(type, x, y, button = 'left') {
      await page('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1 });
    },
    async click(x, y) {
      await api.mouse('mouseMoved', x, y, 'none');
      await api.mouse('mousePressed', x, y);
      await api.mouse('mouseReleased', x, y);
    },
    async screenshot(file, { format = 'jpeg', quality = 88 } = {}) {
      const { data } = await page('Page.captureScreenshot', { format, quality, captureBeyondViewport: false });
      const bytes = Buffer.from(data, 'base64');
      writeFileSync(file, bytes);
      return bytes.length;
    },
    async close() {
      try {
        await send('Browser.close');
      } catch {
        // already gone
      }
      ws.close();
      const exited = new Promise((resolve) => proc.once('exit', resolve));
      proc.kill();
      await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 3000))]);
      try {
        rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      } catch {
        // Chrome may still hold a file; the temp profile is left for the OS to clear.
      }
    },
  };
  return api;
}

/** Starts serve.ts on a port and resolves once it is listening. */
export async function startServer(port) {
  const proc = spawn(process.execPath, ['serve.ts', '--port', String(port)], { cwd: new URL('..', import.meta.url).pathname });
  await new Promise((resolve) => proc.stdout.once('data', resolve));
  return proc;
}

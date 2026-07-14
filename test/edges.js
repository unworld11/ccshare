'use strict';
// Edge-case regressions: input validation and code normalization.
const { spawn } = require('child_process');
const path = require('path');
const WebSocket = require('ws');

const BIN = path.join(__dirname, '..', 'bin', 'ccshare.js');
let failures = 0;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function check(name, ok, detail) {
  if (ok) console.log('PASS ' + name);
  else { failures++; console.log('FAIL ' + name + (detail ? ': ' + detail : '')); }
}

function run(args) {
  const p = spawn('node', [BIN, ...args], { stdio: 'pipe' });
  let out = '';
  p.stdout.on('data', (d) => { out += d; });
  p.stderr.on('data', (d) => { out += d; });
  return { p, out: () => out };
}

(async () => {
  // punctuated/lowercase --code still matches a normalized joiner
  const h = run(['host', '--no-relay', '--no-menubar', '--no-tunnel', '--port', '45979', '--code', '7kq-2fm', 'bash', '-c', 'sleep 3']);
  await wait(1200);
  const ws = new WebSocket('ws://127.0.0.1:45979');
  const res = await new Promise((resolve) => {
    ws.on('open', () => ws.send(JSON.stringify({ t: 'join', code: '7KQ2FM', name: 'x', cols: 80, rows: 24 })));
    ws.on('message', (d, bin) => { if (!bin) resolve(JSON.parse(d).t); });
    ws.on('error', () => resolve('conn-error'));
    setTimeout(() => resolve('timeout'), 3000);
  });
  check('normalized --code matches joiner', res === 'ok', res);
  ws.close();
  h.p.kill('SIGKILL');

  // bad numeric flags die with a readable message
  const p1 = run(['host', '--port', 'abc']);
  await wait(900);
  check('--port abc rejected clearly', p1.out().includes('--port must be a number'), p1.out().trim().slice(0, 80));
  p1.p.kill('SIGKILL');

  // too-short custom code rejected
  const p2 = run(['host', '--no-relay', '--no-menubar', '--no-tunnel', '--code', 'AB', 'bash', '-c', 'true']);
  await wait(900);
  check('--code AB rejected clearly', p2.out().includes('4-12'), p2.out().trim().slice(0, 80));
  p2.p.kill('SIGKILL');

  // missing agent binary gets a helpful error, not a pty crash
  const p3 = run(['host', '--no-relay', '--no-menubar', '--no-tunnel', 'definitely-not-a-real-agent']);
  await wait(900);
  check('missing agent explained', p3.out().includes('not found - is it installed'), p3.out().trim().slice(0, 90));
  p3.p.kill('SIGKILL');

  process.exit(failures ? 1 : 0);
})();

'use strict';
const dgram = require('dgram');
const { hashCode } = require('./codes');

const DISCOVERY_PORT = 42517;

// Host side: answer LAN broadcasts that carry the right code hash with our ws port.
function startResponder(code, wsPort) {
  const sock = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  const h = hashCode(code);
  sock.on('message', (msg, rinfo) => {
    let m;
    try { m = JSON.parse(msg.toString()); } catch { return; }
    if (m && m.t === 'discover' && m.h === h) {
      const reply = Buffer.from(JSON.stringify({ t: 'here', h, port: wsPort }));
      sock.send(reply, rinfo.port, rinfo.address);
    }
  });
  sock.on('error', () => {});
  sock.bind(DISCOVERY_PORT);
  return () => { try { sock.close(); } catch {} };
}

// Joiner side: broadcast probes until a host with this code answers, or time out.
function discover(code, timeoutMs = 3500) {
  return new Promise((resolve) => {
    const sock = dgram.createSocket('udp4');
    const h = hashCode(code);
    const probe = Buffer.from(JSON.stringify({ t: 'discover', h }));
    let done = false;
    let iv = null;
    let to = null;
    const finish = (val) => {
      if (done) return;
      done = true;
      clearInterval(iv);
      clearTimeout(to);
      try { sock.close(); } catch {}
      resolve(val);
    };
    sock.on('message', (msg, rinfo) => {
      let m;
      try { m = JSON.parse(msg.toString()); } catch { return; }
      if (m && m.t === 'here' && m.h === h) finish({ host: rinfo.address, port: m.port });
    });
    sock.on('error', () => finish(null));
    sock.bind(() => {
      try { sock.setBroadcast(true); } catch {}
      const send = () => { try { sock.send(probe, DISCOVERY_PORT, '255.255.255.255'); } catch {} };
      send();
      iv = setInterval(send, 600);
      to = setTimeout(() => finish(null), timeoutMs);
    });
  });
}

module.exports = { startResponder, discover, DISCOVERY_PORT };

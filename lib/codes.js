'use strict';
const crypto = require('crypto');

// no I, L, O, 0, 1 - codes get read out loud over calls
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function generateCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

// discovery probes go out as LAN broadcast, so they carry a hash, not the code
function hashCode(code) {
  return crypto.createHash('sha256').update(String(code).toUpperCase()).digest('hex').slice(0, 16);
}

function normalizeCode(code) {
  return String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

module.exports = { generateCode, hashCode, normalizeCode };

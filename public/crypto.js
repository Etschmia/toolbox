/* Verschlüsselung für "Geheimnis" — AES-256-GCM per WebCrypto.
   Link-Format:  https://tools.martuni.de/s/<id>#<key>
     key  = 32 Zufallsbytes, base64url
   Ohne Passphrase: AES-Schlüssel = key.
   Mit Passphrase:  AES-Schlüssel = PBKDF2-SHA256(passphrase, salt = key, 300 000 Runden)
   → der Link allein reicht dann nicht; die Passphrase wird getrennt übermittelt. */
'use strict';

const SecretCrypto = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  async function deriveKey(keyBytes, passphrase) {
    if (!passphrase) {
      return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
    }
    const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: keyBytes, iterations: 300000 },
      base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }

  async function encrypt(text, passphrase) {
    const keyBytes = crypto.getRandomValues(new Uint8Array(32));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(keyBytes, passphrase);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(text));
    return { fragment: b64u.enc(keyBytes), iv: b64u.enc(iv), ct: b64u.enc(ct) };
  }

  async function decrypt(fragment, ivB64, ctB64, passphrase) {
    const key = await deriveKey(b64u.dec(fragment), passphrase);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64u.dec(ivB64) }, key, b64u.dec(ctB64));
    return dec.decode(pt);
  }

  return { encrypt, decrypt };
})();

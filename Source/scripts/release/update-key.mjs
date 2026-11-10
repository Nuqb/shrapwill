import fs from 'node:fs';
import path from 'node:path';
import { createPrivateKey, createPublicKey, generateKeyPairSync } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const publicConfigPath = path.join(sourceRoot, 'config/updates.json');
export const privateKeyPath = path.join(sourceRoot, '.release-keys/updater-private.pem');
export function rawPublicKey(key) {
  return Buffer.from(createPublicKey(key).export({ format: 'jwk' }).x, 'base64url').toString(
    'base64',
  );
}
export function signingKey() {
  const pem = process.env.SHRAPWILL_UPDATE_PRIVATE_KEY || fs.readFileSync(privateKeyPath, 'utf8');
  const key = createPrivateKey(pem);
  if (key.asymmetricKeyType !== 'ed25519') throw Error('The update signing key must be Ed25519.');
  const configured = JSON.parse(fs.readFileSync(publicConfigPath, 'utf8'));
  if (rawPublicKey(key) !== configured.publicKey)
    throw Error('The signing key does not match this application.');
  return key;
}
export function initializeKey() {
  if (fs.existsSync(privateKeyPath)) {
    signingKey();
    return false;
  }
  if (fs.existsSync(publicConfigPath))
    throw Error('A public key already exists. Restore its private key; do not replace it.');
  const { privateKey } = generateKeyPairSync('ed25519');
  fs.mkdirSync(path.dirname(privateKeyPath), { recursive: true });
  fs.mkdirSync(path.dirname(publicConfigPath), { recursive: true });
  fs.writeFileSync(privateKeyPath, privateKey.export({ format: 'pem', type: 'pkcs8' }), {
    mode: 0o600,
    flag: 'wx',
  });
  fs.writeFileSync(
    publicConfigPath,
    JSON.stringify({ repository: 'Nuqb/shrapwill', publicKey: rawPublicKey(privateKey) }, null, 2) +
      '\n',
    { flag: 'wx' },
  );
  return true;
}

import { initializeKey, privateKeyPath } from './release/update-key.mjs';
const created = initializeKey();
console.log(
  created
    ? 'Created the update signing key and public configuration.'
    : 'The existing update signing key matches the application.',
);
console.log(`Keep the private key backed up securely: ${privateKeyPath}`);
console.log(
  'For GitHub Actions, store its contents in the SHRAPWILL_UPDATE_PRIVATE_KEY repository secret. Never commit it.',
);

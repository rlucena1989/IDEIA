#!/bin/bash
KEY_FILE="$(dirname "$0")/../src-tauri/updater-keys.json"
if [ -f "$KEY_FILE" ] && [ "$1" != "--force" ]; then
  echo "Keys already exist at $KEY_FILE. Use --force to regenerate."
  exit 0
fi
npm run tauri signer generate -- -w "$KEY_FILE"
echo "Keys generated: $KEY_FILE"
echo "Add the public key to tauri.conf.json -> plugins.updater.pubkey"

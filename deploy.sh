#!/usr/bin/bash -eu

npm run build
# I could also copy over style.css, if I had one...
cp main.js manifest.json ~/ObsidianVault/.obsidian/plugins/obsidian-tools/
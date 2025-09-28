#!/usr/bin/env node
// build-cjs.mjs - génère un wrapper CJS pour compat require.
import { writeFileSync } from 'node:fs';

// Le code principal est ESM; on fournit un pont CJS minimal.
const content = `"use strict";\n// CJS wrapper auto-généré\nmodule.exports = require('./index.node.js');\n`;
writeFileSync(new URL('../dist/index.node.cjs', import.meta.url), content, 'utf8');
console.log('✔ index.node.cjs (wrapper) généré');

#!/usr/bin/env node --no-warnings

/**
 * @fileoverview
 * This file is the start script for the package.
 * The package.json may configure this to be run with `npm start`.
 * Pass CLI args like `npm start -- --help`.
 */

import cli from "./cli.ts"
import { realpath } from "fs/promises"

async function main() {
  await cli(...process.argv)
}

if (import.meta.url === "file://" + await realpath(process.argv[1])) {
  await main()
}

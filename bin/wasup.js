#!/usr/bin/env node
import 'tsx'
const cli = await import('../wasup-cli.ts')
await cli.default(...process.argv)

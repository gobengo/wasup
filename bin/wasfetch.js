#!/usr/bin/env node
import 'tsx'
const cli = await import('../wasfetch-cli.ts')
await cli.default(...process.argv)

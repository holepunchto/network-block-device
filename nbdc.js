#!/usr/bin/env node

const { spawnSync } = require('child_process')

const modprobe = spawnSync('sudo', ['modprobe', 'nbd'], { stdio: 'inherit' })

if (modprobe.status === 1) {
  process.exit(1)
}

const disconnect = spawnSync('sudo', ['nbd-client', '-d', process.argv[3]], { stdio: 'inherit' })

if (disconnect.status === 1) {
  process.exit(1)
}

spawnSync('sudo', ['nbd-client', '-N', 'export1', '-unix', process.argv[2], process.argv[3], '-b', '1024'
], { stdio: 'inherit' })

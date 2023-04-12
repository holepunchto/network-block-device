#!/usr/bin/env node

const { spawnSync } = require('child_process')

const modprobe = spawnSync('sudo', ['modprobe', 'nbd'], { stdio: 'inherit' })
if (modprobe.stderr) {
  console.error(modprobe.stderr.toString())
  process.exitCode = 1
}

const disconnect = spawnSync('sudo', ['nbd-client', '-d', process.argv[3]], { stdio: 'inherit' })
if (disconnect.stderr) {
  console.error(disconnect.stderr.toString())
  process.exitCode = 1
}

const connect = spawnSync('sudo', ['nbd-client', '-N', 'export1', '-unix', process.argv[2], process.argv[3], '-b', '1024'
], { stdio: 'inherit' })
if (connect.stderr) {
  console.error(connect.stderr.toString())
  process.exitCode = 1
}

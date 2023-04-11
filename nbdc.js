#!/usr/bin/env node

const { spawnSync } = require('child_process')

const modprobe = spawnSync('sudo', ['modprobe', 'nbd'])
if (modprobe.error) {
  console.error(`Error: ${modprobe.error}`)
  process.exit(1)
}

const disconnect = spawnSync('sudo', ['nbd-client', '-d', process.argv[3]])
if (disconnect.error) {
  console.error(`Error: ${disconnect.error}`)
  process.exit(1)
}

const connect = spawnSync('sudo', ['nbd-client', '-N', 'export1', '-unix', process.argv[2], process.argv[3], '-b', '1024'
])
if (connect.error) {
  console.error(`Error: ${connect.error}`)
  process.exit(1)
}
console.log(connect.stdout.toString())

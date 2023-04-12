#!/usr/bin/env node

const { spawnSync } = require('child_process')

spawnSync('sudo', ['modprobe', 'nbd'], { stdio: 'inherit' })

spawnSync('sudo', ['nbd-client', '-d', process.argv[3]], { stdio: 'inherit' })

spawnSync('sudo', ['nbd-client', '-N', 'export1', '-unix', process.argv[2], process.argv[3], '-b', '1024'
], { stdio: 'inherit' })

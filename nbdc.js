#!/usr/bin/env node

const fs = require('fs')

const sh = require('shellblazer')

const argv = require('minimist')(process.argv.slice(2), {
  alias: {
    run: 'r',
    bootstrap: 'b'
  },
  boolean: ['b']
})

const MOUNTPOINT = '/tmp/hbd_mnt'
const socket = argv._[0]
const device = argv._[1]

const RUN = argv.r
const BOOTSTRAP = argv.b

fs.access(MOUNTPOINT, fs.constants.F_OK, (err) => {
  if (err) {
    fs.mkdir(MOUNTPOINT, (err) => {
      if (err) throw err
    })
  }
})

async function connect () {
  await sh(['sudo', 'modprobe', 'nbd'],
    ['sudo', 'nbd-client', '-d', device],
    ['sudo', 'nbd-client', '-N', 'export1', '-unix', socket, device, '-b', '1024'])
  if (BOOTSTRAP) {
    await sh(['sudo', 'mkfs.ext4', device],
      ['sudo', 'mount', device, MOUNTPOINT, '-o', 'noatime'],
      ['sudo', 'debootstrap', 'stable', MOUNTPOINT],
      ['sudo', 'umount', MOUNTPOINT])
  }
}

if (RUN) {
  sh(['sudo', 'systemd-nspawn', '-i', RUN])
} else {
  connect()
}

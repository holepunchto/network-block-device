#!/usr/bin/env node

const { exec } = require('child_process')

const command = `sudo modprobe nbd && sudo nbd-client -d ${process.argv[3]} && sudo nbd-client -N export1 -unix ${process.argv[2]} ${process.argv[3]} -b 1024`

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.log(error.message)
    return
  }
  if (stderr) {
    console.log(stderr)
    return
  }
  console.log(stdout)
})

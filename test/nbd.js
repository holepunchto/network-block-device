const test = require('brittle')
const NBDServer = require('..')
const sh = require('shellblazer')
const fs = require('fs')
const { exec } = require('child_process')

function nbdTemplate (socket) {
  const blocks = new Map()

  const server = new NBDServer({
    blockSize: 1024,
    size: 16 * 1024 * 1024 * 1024,
    read (index) {
      return blocks.get(index)
    },
    write (index, block) {
      blocks.set(index, block)
    },
    del (index) {
      blocks.delete(index)
    }
  })

  try {
    fs.unlinkSync(socket)
  } catch (err) {}
  server.listen(socket)
  return server
}

test('hello world', async function (t) {
  const socket = '/tmp/nbdTest1'
  const device = '/dev/nbd1'
  const MOUNTPOINT = '/tmp/nbd_mnt1'

  fs.mkdirSync(MOUNTPOINT, { recursive: true })

  const nbd = nbdTemplate(socket)

  await sh(
    ['sudo', 'nbd-client', '-d', device],
    ['sudo', 'nbd-client', '-N', 'export1', '-unix', socket, device, '-b', '4096'],
    ['sudo', 'mkfs.ext4', device],
    ['sudo', 'mount', device, MOUNTPOINT, '-o', 'noatime'])

  const sh1 = sh.configure({ cwd: MOUNTPOINT })
  await sh1(
    ['sudo', 'touch', 'file.txt'],
    ['sudo', 'chmod', 'a+wrx', 'file.txt']
  )

  fs.writeFileSync(`${MOUNTPOINT}/file.txt`, 'hello, world!')
  const data = fs.readFileSync(`${MOUNTPOINT}/file.txt`, { encoding: 'utf8', flag: 'r' })
  t.is(data, 'hello, world!')

  t.teardown(async function () {
    await nbd.server.close()
    await nbd.connections.forEach(async c => await c.destroy())
    console.log('connections are:')
    console.log(nbd.server.connections)
    exec(`sudo umount ${device}`, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`)
        return
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`)
        return
      }
      console.log(`stdout: ${stdout}`)
    })
    // await sh(['sudo', 'umount', device])
    console.log('reached the end')
  })
})

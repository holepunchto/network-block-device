# network-block-device

NBD server implemention in JS focused around providing an API for implementing virtual block devices

```
npm install -g network-block-device
```

The package contains a simple CLI script `nbdc.js` to connect the Linux client to the server

After a global installation, you can call it with

```bash
nbdc <unix-socket> <nbd-device>
```

## Usage

```js
const NBDServer = require('network-block-device')

const blocks = new Map()

const server = new NBDServer({
  blockSize: 1024, // 1KB
  size: 16 * 1024 * 1024 * 1024, // 16GB block size
  async read (blockIndex) {
    // called when someone wants to read a block, you should return it
    // if no block exists for this index, return null/undefined
    return blocks.get(blockIndex)
  },
  async write (blockIndex, block) {
    // called when someone wants to write a block, you should store it
    blocks.set(blockIndex, block)
  },
  async del (blockIndex) {
    // called when someone wants to delete a block
    blocks.delete(blockIndex)
  }
})

server.listen('/tmp/nbd')
```

# Example

Warning: the example has a default blocksize of 1024. If the client you're using has a different blocksize, you will need to change it on one side or the other in order for them to match, otherwise you'll have unexpected behavior.

**1. Installation**

First of all, you need to install the nbd package, I compiled the version from sourceforge: https://sourceforge.net/projects/nbd/files/

**2. Server terminal**

Then, download the `network-block-device` package, open it in a terminal, and run

```bash
node example
```

to start the server. By default the app provides a 16GB export.

**3. Client terminal**

Open another terminal anywhere, and run 

```bash
nbdc /tmp/nbd /dev/nbd5
```
the client terminal should log something like

```bash
bs=512, sz=17179869184 bytes
```
This means the handshake phase was successful.

**4. Making a file system**

You can make a file system on the device by running

```bash
sudo mkfs.ext4 /dev/nbd5
```

**5. Mounting and unmounting the device**

You can now mount the device with

```bash
sudo mount /dev/nbd5 /mnt
```
You can cd into the device and work on it like it was a regular hard drive. 

Remember to unmount it before stopping the server, using

```bash
sudo umount /mnt
```

## Dependencies

TODO

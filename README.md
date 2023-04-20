# network-block-device

NBD server implemention in JS focused around providing an API for implementing virtual block devices

The examples use our client CLI:

```
npm install -g nbdc
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

**1. Installation**

First of all, you need to install the nbd package, I compiled the version from sourceforge: https://sourceforge.net/projects/nbd/files/
But you can find packages for various distros at https://repology.org/project/nbd/versions

The `network-block-device` package contains a simple CLI script `nbdc.js` to connect the Linux client to the server, so install it globally

```
npm install -g network-block-device
```

**2. Server terminal**

Open the `network-block-device` folder in a terminal, and run

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

# tiny-nbd-server

NBD server implemention in JS focused around providing an API for implementing virtual block devices

```
npm install tiny-nbd-server
```

## Usage

```js
const NBDServer = require('nbd-server')

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

And then mount the block device with `nbd-client`, with something like

```
sudo nbd-client -N export1 -unix /tmp/nbd /dev/nbd0
```

## Dependencies

TODO

# tiny-nbd-server

NBD server implemention in JS focused around providing an API for implementing virtual block devices

```
npm install tiny-nbd-server
```

## Usage

```js
const NBDServer = require('nbd-server')

const server = new NBDServer({
  blockSize: 1024, // 1KB
  size: 16 * 1024 * 1024 * 1024, // 16GB block size
  async read (blockIndex) {
    // called when someone wants to read a block, you should return it
    // if no block exists for this index, return null
  },
  async write (blockIndex, block) {
    // called when someone wants to write a block, you should store it
  },
  async del (blockIndex) {
    // called when someone wants to delete a block
  }
})

server.listen('/tmp/nbd')
```

## Dependencies

TODO

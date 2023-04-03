const fs = require('fs')
const NBDServer = require('./')

const blocks = new Map()

let reads = 0
let writes = 0
let dels = 0

const server = new NBDServer({
  blockSize: 1024,
  size: 16 * 1024 * 1024 * 1024,
  open () { // mostly for debugging
    console.log('client connected')
  },
  close () { // mostly for debugging
    console.log('client closed')
  },
  read (index) {
    reads++
    status('get', index)
    return blocks.get(index)
  },
  write (index, block) {
    blocks.set(index, block)
    writes++
    status('set', index)
  },
  del (index) {
    if (!blocks.delete(index)) return
    dels++
    status('del', index)
  }
})

try {
  fs.unlinkSync('/tmp/nbd')
} catch {}
server.listen('/tmp/nbd')

function status (op, index) {
  console.log(op, 'block', index, 'total read=', reads, 'total writes=', writes, 'total dels=', dels, 'total dirty blocks=', blocks.size)
}

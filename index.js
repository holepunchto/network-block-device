const constants = require('./constants')
const net = require('net')
const fs = require('fs')

const HANDSHAKE = 0
const OPTIONS_START = 1
const OPTIONS_END = 2
const REQUEST_START = 3
const REQUEST_END = 4

const DEFAULT_BLOCK_SIZE = 1024
const DEFAULT_EMPTY_BLOCK = Buffer.alloc(DEFAULT_BLOCK_SIZE)

module.exports = class NBDServer {
  constructor (handlers) {
    this.pipes = []
    this.closed = false
    this.connections = new Set()
    this.server = net.createServer((conn) => {
      if (this.closed) {
        conn.on('error', noop)
        conn.destroy()
        return
      }
      const p = new NBDProtocol(conn, handlers)
      this.connections.add(p)
      if (handlers.open) noopPromise(handlers.open(p))
      conn.on('close', () => this.connections.delete(p))
    })
  }

  async close () {
    this.closed = true
    const all = [...this.connections].map(c => c.destroy())
    all.push(new Promise(resolve => {
      this.server.close(resolve)
      this.pipes.forEach(p => fs.unlink(p, e => noop(e)))
    }))
    await Promise.all(all)
  }

  listen (...addr) {
    this.server.listen(...addr)
    this.pipes.concat(addr.filter(a => typeof addr !== 'number'))
  }

  static createServer (handlers) {
    return new this(handlers)
  }

  static createProtocol (stream, handlers) {
    return new NBDProtocol(stream, handlers)
  }
}

class NBDProtocol {
  constructor (stream, handlers) {
    this.stream = stream
    this.blockSize = handlers.blockSize || DEFAULT_BLOCK_SIZE
    this.emptyBlock = this.blockSize === DEFAULT_BLOCK_SIZE ? DEFAULT_EMPTY_BLOCK : Buffer.alloc(this.blockSize)

    this._buffer = null
    this._missing = 4
    this._state = HANDSHAKE
    this._nextOption = 0
    this._nextRequest = null

    this.stream.on('data', this._ondata.bind(this))
    this.stream.on('error', noop)
    this.stream.on('close', this.destroy.bind(this))

    this.handlers = handlers
    this.destroyed = false
    this.closed = new Promise((resolve) => this.stream.once('close', resolve))

    this._sendHandshake()
  }

  end () {
    if (this.destroyed) return this.closed
    this.destroyed = true
    this.stream.end()
    this._triggerClose(null)
    return this.closed
  }

  destroy (err) {
    if (this.destroyed) return this.closed
    this.destroyed = true
    this.stream.destroy(err)
    this._triggerClose(err)
    return this.closed
  }

  _triggerClose (err) {
    if (this.handlers.close) {
      noopPromise(this.handlers.close(err, this))
    }
  }

  _sendHandshake () {
    const hs = Buffer.allocUnsafe(8 + 8 + 2)
    hs.set(constants.NBDMAGIC, 0)
    hs.set(constants.IHAVEOPT, 8)
    hs.writeUint16BE(1, 16) // fixed newstyle opt
    this.stream.write(hs)
  }

  _ondata (data) {
    if (this._buffer === null) this._buffer = data
    else this._buffer = Buffer.concat([this._buffer, data])

    while (this.destroyed === false && this._buffer !== null && this._missing <= this._buffer.byteLength) {
      const data = this._buffer.subarray(0, this._missing)
      this._buffer = this._missing === this._buffer.byteLength ? null : this._buffer.subarray(this._missing)
      this._missing = 0
      this._dispatch(data)
    }
  }

  _dispatch (data) {
    switch (this._state) {
      case HANDSHAKE: return this._onhandshake(data)
      case OPTIONS_START: return this._onoptionstart(data)
      case OPTIONS_END: return this._onoptionend(data)
      case REQUEST_START: return this._onrequeststart(data)
      case REQUEST_END: return this._onrequestend(data)
    }
  }

  _onhandshake (data) {
    // TODO: check the flags for stuff
    // const clientFlags = data.readUint32BE(0)

    this._state = OPTIONS_START
    this._setupOption()
  }

  _onoptionstart (data) {
    const magic = data.subarray(0, 8)

    if (!magic.equals(constants.IHAVEOPT)) {
      this.destroy(new Error('Unexpected option magic bytes: ' + magic.toString('hex')))
      return
    }

    this._state = OPTIONS_END
    this._nextOption = data.readUint32BE(8)

    const size = data.readUint32BE(12)
    this._missing = size
  }

  _replyHandshake () {
    const infoHeader = this._optHeader(constants.NBD_OPT_GO, constants.NBD_REP_INFO, 26)
    const infoBody = Buffer.allocUnsafe(26)

    // export info (12 bytes)
    infoBody.writeUint16BE(constants.NBD_INFO_EXPORT, 0)
    writeUint64BE(infoBody, this.handlers.size, 2)
    infoBody.writeUint16BE(1, 10) // has flags flag

    // block size (14 bytes)
    infoBody.writeUint16BE(constants.NBD_INFO_BLOCK_SIZE, 12)
    infoBody.writeUint32BE(this.blockSize, 14) // min
    infoBody.writeUint32BE(this.blockSize, 18) // pref
    infoBody.writeUint32BE(this.blockSize, 22) // max

    const ack = this._optHeader(constants.NBD_OPT_GO, constants.NBD_REP_ACK, 0)

    this.stream.write(Buffer.concat([
      infoHeader,
      infoBody,
      ack
    ]))
  }

  _optHeader (opts, type, len) {
    const buf = Buffer.allocUnsafe(20)

    buf.set(constants.REPLYMAGIC, 0)
    buf.writeUint32BE(opts, 8)
    buf.writeUint32BE(type, 12)
    buf.writeUint32BE(len, 16)

    return buf
  }

  _onoptionend (data) {
    const option = this._nextOption

    this._nextOption = 0

    if (option === constants.NBD_OPT_GO) {
      this._replyHandshake()
      this._setupRequest()
    } else {
      this._setupOption()
    }
  }

  _onrequeststart (data) {
    const magic = data.readUint32BE(0)

    if (magic !== constants.REQUEST) {
      this.destroy(new Error('Unexpected request magic number: ' + magic))
      return
    }

    this._nextRequest = {
      commandFlags: data.readUint16BE(4),
      type: data.readUint16BE(6),
      handle: data.subarray(8, 16),
      offset: readUint64BE(data, 16),
      size: data.readUint32BE(24),
      data: null
    }

    if (this._nextRequest.type === constants.NBD_CMD_WRITE) {
      this._state = REQUEST_END
      this._missing = this._nextRequest.size
    } else {
      this._onrequestend(null)
    }
  }

  _onrequestend (data) {
    const req = this._nextRequest
    this._nextRequest = null
    req.data = data

    this._dispatchRequest(req)
    this._setupRequest()
  }

  _dispatchRequest (req) {
    switch (req.type) {
      case constants.NBD_CMD_READ: return this._onread(req)
      case constants.NBD_CMD_WRITE: return this._onwrite(req)
    }

    this.destroy(new Error('Unhandled request type: ' + req.type))
  }

  _setupOption () {
    this._state = OPTIONS_START
    this._missing = 16
  }

  _setupRequest () {
    this._state = REQUEST_START
    this._missing = 4 + 2 + 2 + 8 + 8 + 4
  }

  _onread (req) {
    const offset = req.offset / this.blockSize
    const all = []

    for (let i = 0; i * this.blockSize < req.size; i++) {
      all.push(this.handlers.read(offset + i, this))
    }

    Promise.all(all).then(this._onreaddone.bind(this, req), this._onrequesterror.bind(this, req))
  }

  _onreaddone (req, blocks) {
    if (this.destroyed) return

    const buf = Buffer.allocUnsafe(16 + blocks.length * this.blockSize)

    buf.writeUint32BE(constants.REPLY, 0)
    buf.writeUint32BE(0, 4) // no error
    buf.set(req.handle, 8)

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i] || this.emptyBlock
      if (block.byteLength !== this.blockSize) {
        this.destroy(new Error('Invalid block from read: ' + block.byteLength + ' bytes'))
        return
      }
      buf.set(block, 16 + i * this.blockSize)
    }

    this.stream.write(buf)
  }

  _onwrite (req) {
    const offset = req.offset / this.blockSize
    const all = []

    for (let i = 0; i * this.blockSize < req.size; i++) {
      const block = req.data.subarray(i * this.blockSize, i * this.blockSize + this.blockSize)
      if (block.byteLength !== this.blockSize) {
        this.destroy(new Error('Invalid block from write: ' + block.byteLength + ' bytes'))
        return
      }

      if (block.equals(this.emptyBlock)) all.push(this.handlers.del(offset + i))
      else all.push(this.handlers.write(offset + i, block, this))
    }

    Promise.all(all).then(this._onwritedone.bind(this, req), this._onrequesterror.bind(this, req))
  }

  _onwritedone (req) {
    if (this.destroyed) return

    const buf = Buffer.allocUnsafe(16)

    buf.writeUint32BE(constants.REPLY, 0)
    buf.writeUint32BE(0, 4) // no error
    buf.set(req.handle, 8)

    this.stream.write(buf)
  }

  _onrequesterror (req, err) {
    if (this.destroyed) return

    // TODO: just reply with an error instead of full shutdown
    this.destroy(err)
  }
}

function writeUint64BE (buf, n, offset) {
  const btm = n & 0xffffffff
  const top = (n - btm) / 0x100000000

  buf.writeUint32BE(top, offset)
  buf.writeUint32BE(btm, offset + 4)
}

function readUint64BE (buf, offset) {
  return 0x100000000 * buf.readUint32BE(offset) + buf.readUint32BE(offset + 4)
}

function noop () {}

function noopPromise (p) {
  if (p && p.then) p.then(noop, noop)
}

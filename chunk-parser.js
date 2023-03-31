const FastFifo = require('fast-fifo')

module.exports = class ChunkParser {
  constructor () {
    this.buffer = null
    this.pending = new FastFifo()
  }

  shift (bytes, metadata) {
    this.pending.push({ bytes, metadata })
  }

  push (data) {
    if (this.buffer === null) this.buffer = data
    else this.buffer = Buffer.concat([this.buffer, data])
  }

  drain () {
    const result = []

    while (this.buffer !== null) {
      const next = this.pending.peek()
      if (this.buffer.byteLength < next.bytes) break

      result.push({
        data: this.buffer.subarray(0, next.bytes),
        metadata: next.metadata
      })

      this.buffer = next.bytes === this.buffer.byteLength ? null : this.buffer.subarray(next.bytes)
      this.pending.shift()
    }

    return result
  }
}

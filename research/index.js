const net = require('net')

const {
  make16,
  make32,
  make64,
  byte2String,
  buffer2String,
  BufferCutter,
  fastCutter
} = require('./utils.js')

const NBDMAGIC = 'NBDMAGIC'
const IHAVEOPT = 'IHAVEOPT'
const replyMagic = make64(1100100111001001)
const transmissionMagic = make32(1732535960)
const error0 = make32(0)
console.log(replyMagic, 'and', transmissionMagic)
const noflag = 0b0000000000000000
const oneflag = 0b0000000000000001

const NBD_REP_ACK = {
  code: 1
}

const NBD_REP_INFO = {
  code: 3
}

const NBD_INFO_EXPORT = {
  code: 0,
  byteLength: 12
}

module.exports = class nbdi {
  constructor (readHook, writeHook, size) {
    this.read = function (data) {
      readHook(data)
    }
    this.write = function (data) {
      writeHook(data)
    }
    this.export = Buffer.alloc(size)
    this.settings = {}
    this.size = size

    this.unixServer = net.createServer()

    // here the main tree?
    this.unixServer.on('connection', (c) => {
      let phase = 'handshake'

      c.write(
        Buffer.concat([
          Buffer.from(NBDMAGIC),
          Buffer.from(IHAVEOPT),
          make16(oneflag)
        ])
      )

      c.on('data', (b) => {
        switch (phase) {
          case 'handshake': {
            const [parsedOpt, parsedOptRaw] = this.parseOption(b)
            let reply = []

            switch (parsedOpt.opt) {
              case 6:
              case 7: {
                reply[0] = this.repBuilder(parsedOpt.opt, NBD_REP_INFO, 12)
                reply[1] = this.repBuilder(parsedOpt.opt, NBD_REP_ACK, 0)
                reply = reply.flat()
              }
            }
            c.write(Buffer.concat(reply))

            phase = parsedOpt.opt === 7 ? 'transmission' : 'handshake'
            break
          }
          case 'transmission': {
            const arrayOfCommands = this.parseCommand(b)
            for (const x of arrayOfCommands) {
              const reply = Object.hasOwn(x, 'dataToWrite')
                ? this.simpleReply(x.clientCommand, x.clientCommandRaw, false)
                : this.simpleReply(x.clientCommand, x.clientCommandRaw, true)
              const ready = Buffer.concat(reply)
              if (Object.hasOwn(x, 'dataToWrite')) {
                x.dataToWrite.copy(this.export, x.clientCommand.offset)
              }
              c.write(ready)
            }

            break
          }
          default: {
            throw new Error(`unknown phase "${phase}"`)
          }
        }
      })
    })

    this.unixServer.on('error', (e) => {
      console.log(e)
    })

    this.connect = function (socket) {
      this.unixServer.listen(socket)
    }
  }

  parseOption (b) {
    // checkMinLength(b, 20);

    const clientNegRaw = {}
    let rawArgs;
    [
      clientNegRaw.flags,
      clientNegRaw.hasOpt,
      clientNegRaw.opt,
      clientNegRaw.dataSize,
      rawArgs
    ] = fastCutter(b, [4, 8, 4, 4, 'rest'])

    const clientNeg = {}
    clientNeg.flags = buffer2String(clientNegRaw.flags)
    clientNeg.hasOpt = clientNegRaw.hasOpt.toString()
    clientNeg.opt = clientNegRaw.opt.readInt32BE(0)
    clientNeg.dataSize = clientNegRaw.dataSize.readInt32BE(0)

    // if (clientNeg.hasOpt != IHAVEOPT) {
    //   throw new Error("Error: missing IHAVEOPT");
    // }

    if (rawArgs.length !== clientNeg.dataSize) {
      throw new Error(`Error: wrong args length.
      It should be ${clientNeg.dataSize}but it's ${rawArgs.length}`)
    }

    if (clientNeg.opt === 7) {
      checkMinLength(rawArgs, 6)
      const bc = new BufferCutter(rawArgs)
      clientNegRaw.args = {}
      clientNeg.args = {}

      clientNegRaw.args.nameLength = bc.extract(4)
      clientNeg.args.nameLength = clientNegRaw.args.nameLength.readInt32BE(0)

      clientNegRaw.args.name = bc.extract(clientNeg.args.nameLength)
      clientNeg.args.name = clientNegRaw.args.name.toString()

      clientNegRaw.args.reqInfo = bc.extract(2)
      clientNeg.args.reqInfo = buffer2String(clientNegRaw.args.reqInfo)
    } else {
      throw new Error('Error: Option not existant or not yet implemented')
    }

    return [clientNeg, clientNegRaw]
  }

  repBuilder (optType, repType, specifLength) {
    const reply = []

    // reply magic
    reply.push(replyMagic)

    // option
    reply.push(make32(optType))

    // reply type
    reply.push(make32(repType.code))

    // length
    reply.push(make32(specifLength))

    switch (repType) {
      case NBD_REP_INFO: {
        reply.push(make16(NBD_INFO_EXPORT.code))
        reply.push(make64(this.size))
        reply.push(make16(oneflag))
        break
      }
      default:
        break
    }
    return reply
  }

  parseCommand (cmd) {
    // checkMinLength(cmd, 28);

    const arrayOfCommands = []

    const actualParser = function (cmd) {
      const clientCommandRaw = {}
      let rest;
      [
        clientCommandRaw.magic,
        clientCommandRaw.flags,
        clientCommandRaw.type,
        clientCommandRaw.handle,
        clientCommandRaw.offset,
        clientCommandRaw.byteLength,
        rest
      ] = fastCutter(cmd, [4, 2, 2, 8, 8, 4, 'rest'])
      // console.log(clientCommandRaw);

      const clientCommand = {
        magic: clientCommandRaw.magic.toString('hex'),
        flags: buffer2String(clientCommandRaw.flags),
        type: clientCommandRaw.type.readInt16BE(0),
        handle: clientCommandRaw.handle.readBigUInt64BE(0),
        offset: Number(clientCommandRaw.offset.readBigUInt64BE(0)),
        byteLength: Number(clientCommandRaw.byteLength.readInt32BE(0))
      }
      // console.log(clientCommand);
      const commands = {
        clientCommand,
        clientCommandRaw
      }

      if (clientCommand.type === 1) {
        commands.dataToWrite = rest.subarray(0, clientCommand.byteLength)
        rest = rest.subarray(clientCommand.byteLength)
      }

      arrayOfCommands.push(commands)

      if (rest.length > 0) {
        actualParser(rest)
      }
    }
    actualParser(cmd)
    return arrayOfCommands
  }

  simpleReply (clientCommand, clientCommandRaw, reading) {
    const reply = []
    reply.push(transmissionMagic)
    reply.push(error0)
    reply.push(clientCommandRaw.handle)
    if (reading === true) {
      reply.push(
        this.export.subarray(
          clientCommand.offset,
          clientCommand.offset + clientCommand.byteLength
        )
      )
    }
    return reply
  }
}

const checkMinLength = function (buffer, x) {
  if (buffer.length < x) {
    throw new Error('Error: message is too short')
  }
}

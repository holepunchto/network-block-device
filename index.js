const net = require("net");

const {
  make16,
  make32,
  make64,
  byte2String,
  buffer2String,
  bufferCutter,
  fastCutter,
} = require("./utils.js");

const NBDMAGIC = "NBDMAGIC";
const IHAVEOPT = "IHAVEOPT";
const replyMagic = make64(1100100111001001);

const noflag = 0b0000000000000000;
// const repMagic  = 0b1100100111001001;

const NBD_REP_ACK = {
  code: 1,
};

const NBD_REP_INFO = {
  code: 3,
};

const NBD_INFO_EXPORT = {
  code: 0,
  length: 12,
};

module.exports = class nbdi {
  constructor(readHook, writeHook, size) {
    this.read = function (data) {
      readHook(data);
    };
    this.write = function (data) {
      writeHook(data);
    };
    this.settings = {};
    this.size = size;

    this.unixServer = net.createServer();

    //here the main tree?
    this.unixServer.on("connection", (c) => {
      c.write(NBDMAGIC);
      c.write(IHAVEOPT);
      const flags = make16(noflag);
      c.write(flags);

      c.on("data", (b) => {
        const [parsedOpt, parsedOptRaw] = parseOption(b);
        console.log(parsedOpt);
        console.log(parsedOptRaw);
        let reply = [];

        switch (parsedOpt.opt) {
          case 6:
          case 7: {
            reply[0] = this.repBuilder(parsedOpt.opt, NBD_REP_INFO, 12);
            reply[1] = this.repBuilder(parsedOpt.opt, NBD_REP_ACK, 0);
            reply = reply.flat();
          }
        }

        console.log(reply);

        for (let x of reply) {
          c.write(x);
        }
      });
    });

    this.unixServer.on("error", (e) => {
      console.log(e);
    });

    this.connect = function (socket) {
      this.unixServer.listen(socket);
    };
  }

  repBuilder(optType, repType, specifLength) {
    let reply = [];

    //reply magic
    reply.push(replyMagic);

    //option
    reply.push(make32(optType));

    //reply type
    reply.push(make32(repType.code));

    //length
    reply.push(make32(specifLength));

    switch (repType) {
      case NBD_REP_INFO: {
        reply.push(make16(NBD_INFO_EXPORT.code));
        reply.push(make64(this.size));
        reply.push(make16(noflag));
      }
      default:
        break;
    }
    return reply;
  }

  // repBuilder(opt) {
  //   let reply = [];

  //   //reply magic
  //   reply.push(replyMagic);

  //   //option
  //   reply.push(make32(opt.opt));

  //   switch (opt.opt) {
  //     case 6:
  //     case 7: {
  //       reply.push(make32(NBD_REP_INFO.code));
  //       reply.push(make32(NBD_INFO_EXPORT.length));
  //       reply.push(make16(NBD_INFO_EXPORT.code));
  //       reply.push(make64(this.size));
  //       reply.push(make16(noflag));
  //     }
  //   }

  //   return reply;
  // }
};

const parseOption = function (b) {
  // checkMinLength(b, 20);

  let clientNegRaw = {};
  let rawArgs;
  [
    clientNegRaw.flags,
    clientNegRaw.hasOpt,
    clientNegRaw.opt,
    clientNegRaw.dataSize,
    rawArgs,
  ] = fastCutter(b, [4, 8, 4, 4, "rest"]);

  let clientNeg = {};
  clientNeg.flags = buffer2String(clientNegRaw.flags);
  clientNeg.hasOpt = clientNegRaw.hasOpt.toString();
  clientNeg.opt = clientNegRaw.opt.readInt32BE(0);
  clientNeg.dataSize = clientNegRaw.dataSize.readInt32BE(0);

  // if (clientNeg.hasOpt != IHAVEOPT) {
  //   throw new Error("Error: missing IHAVEOPT");
  // }

  if (rawArgs.length !== clientNeg.dataSize) {
    throw new Error(`Error: wrong args length.
    It should be ${clientNeg.dataSize}but it's ${rawArgs.length}`);
  }

  if (clientNeg.opt === 7) {
    checkMinLength(rawArgs, 6);
    const bc = new bufferCutter(rawArgs);
    clientNegRaw.args = {};
    clientNeg.args = {};

    clientNegRaw.args.nameLength = bc.extract(4);
    clientNeg.args.nameLength = clientNegRaw.args.nameLength.readInt32BE(0);

    clientNegRaw.args.name = bc.extract(clientNeg.args.nameLength);
    clientNeg.args.name = clientNegRaw.args.name.toString();

    clientNegRaw.args.reqInfo = bc.extract(2);
    clientNeg.args.reqInfo = buffer2String(clientNegRaw.args.reqInfo);
  } else {
    throw new Error("Error: Option not existant or not yet implemented");
  }

  return [clientNeg, clientNegRaw];
};

const checkMinLength = function (buffer, x) {
  if (buffer.length < x) {
    throw new Error("Error: message is too short");
  }
};

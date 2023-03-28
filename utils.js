const make16 = function (number) {
  const res = Buffer.alloc(2);
  res.writeInt16BE(number);
  return res;
};

const make32 = function (number) {
  const res = Buffer.alloc(4);
  res.writeInt32BE(number);
  return res;
};

const make64 = function (number) {
  const res = Buffer.alloc(8);
  res.writeBigInt64BE(BigInt(number));
  return res;
};

function byte2String(b) {
  return b.toString(2).padStart(8, "0");
}

function buffer2String(b) {
  return [...b].map(byte2String).join("");
}

const bufferCutter = class {
  constructor(buffer) {
    this.buffer = buffer;
    this.cursor = 0;
  }
  extract(upTo) {
    const res = this.buffer.subarray(this.cursor, this.cursor + upTo);
    this.cursor = this.cursor + upTo;
    return res;
  }
  rest() {
    return this.buffer.subarray(this.cursor);
  }
};

const fastCutter = function (buffer, arr) {
  const bc = new bufferCutter(buffer);
  const res = [];
  for (n of arr) {
    if (n === "rest") {
      res.push(bc.rest());
    } else {
      res.push(bc.extract(n));
    }
  }
  return res;
};

module.exports = {
  make16,
  make32,
  make64,
  byte2String,
  buffer2String,
  bufferCutter,
  fastCutter,
};

exports.NBDMAGIC = Buffer.from('NBDMAGIC')
exports.IHAVEOPT = Buffer.from('IHAVEOPT')
exports.REPLYMAGIC = Buffer.from([0x00, 0x03, 0xe8, 0x89, 0x04, 0x55, 0x65, 0xa9])

exports.REPLY = 0x67446698
exports.REQUEST = 0x25609513

// from https://github.com/NetworkBlockDevice/nbd/blob/master/doc/proto.md

exports.NBD_OPT_INFO = 6
exports.NBD_OPT_GO = 7

exports.NBD_REP_ACK = 1
exports.NBD_REP_SERVER = 2
exports.NBD_REP_INFO = 3

exports.NBD_INFO_EXPORT = 0
exports.NBD_INFO_BLOCK_SIZE = 3

exports.NBD_CMD_READ = 0
exports.NBD_CMD_WRITE = 1
exports.NBD_CMD_DISC = 2
exports.NBD_CMD_FLUSH = 3
exports.NBD_CMD_TRIM = 4
exports.NBD_CMD_CACHE = 5
exports.NBD_CMD_WRITE_ZEROES = 6
exports.NBD_CMD_BLOCK_STATUS = 7
exports.NBD_CMD_RESIZE = 8

const net = require('net')

const fs = require('fs')

const ogSock = '/tmp/unix10'

const mySock = '/tmp/unix100'

const facingTheClient = net.createServer()

facingTheClient.listen(mySock)

process.on('SIGINT', function () {
  fs.unlinkSync(mySock)
  process.exit()
})

facingTheClient.on('connection', (s) => {
  console.log('---------------------------------------------------')
  const facingTheServer = net.createConnection(ogSock)
  facingTheServer.on('data', function (data) {
    console.log(
`SERVER SAID:

translation: ${data.toString()}

${toBinaryString(data)}

`)

    s.write(data)
  })
  s.on('data', function (data) {
    console.log(
`CLIENT SAID:

translation: ${data.toString()}

${toBinaryString(data)}

`)

    facingTheServer.write(data)
  })
})

// I think this function was from StackOverflow
function toBinaryString (buf) {
  const result = []
  for (const b of buf) {
    result.push(`${result.length + 1}. ${b.toString(2).padStart(8, '0')}`)
  }
  return result.join('\n')
}

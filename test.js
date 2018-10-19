const dgram = require('dgram')
const PORT = 8081
const HOST = '127.0.0.1'
const message = new Buffer(JSON.stringify({
  thingName: '',
  temp: 26,
  hum: 33,
  auth: ''
}))

var client = dgram.createSocket('udp4')
client.send(message, 0, message.length, PORT, HOST, (err, bytes) => {
  if (err) {
    console.log(err)
    return
  }
  
  console.log(`UDP message sent to ${HOST}:${PORT}`)
  client.close()
})

const dgram = require('dgram')
const argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .option('path', { alias: 'c' })
  .option('port', { alias: 'n' })
  .option('username', { alias: 'u' })
  .option('password', { alias: 'p' })
  .demandOption(['path', 'port', 'username', 'password'], 'Please specify the required arguments to run the application')
  .help()
  .argv
const utils = require('./utils.js')

// Create IPv4 UDP server
const server = dgram.createSocket('udp4')

/* The 'listening' event is whenever a socket begins listening for datagram messages.
 * This occurs as soon as UDP sockets are created.
 */
server.on('listening', () => {
  const address = server.address()
  console.log(`server listening on ${address.address}:${address.port}`)
})

// Error event
server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`)
  server.close()
})

// Accept an UDP packet and retransmit it using MQTT
server.on('message', async (msg, rinfo) => {
  console.log('%s\x1b[32m%s\x1b[0m%s', 'server got: ', msg, ` from ${rinfo.address}:${rinfo.port}`)

  try {
    const data = JSON.parse(msg)

    // Verify payload content
    if (typeof data.thingName === 'undefined' || typeof data.auth === 'undefined')
      return

    try {
      // Check if certificate already exists for incoming Thing
      await utils.isValidCert(argv.path, data.thingName)
      const verified = await utils.verifyMessage(data.auth, data.thingName, argv.path)
      
      // Verified, relay message to MIC
      if (verified === true) {
        delete data.auth
        await utils.sendMessage(data.thingName, data, argv.path)
      }

    // Certificate does NOT exist. Fetch it from MIC.
    } catch (e) {
      try {
        // Fetch and store certificate from MIC
        await utils.getCertificate(argv.username, argv.password, data.thingName, argv.path)
        const verified = await utils.verifyMessage(data.auth, data.thingName, argv.path)

        // Verified, relay message to MIC
        if (verified === true) {
          delete data.auth
          utils.sendMessage(data.thingName, data, argv.path)
        }
      } catch (e) {
        console.log('Error occured: ', e)
      }
    }
  } catch (e) {
    console.log('Error occured: ', e)
  }
})

server.bind(argv.port)

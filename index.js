const dgram = require('dgram');
const argv = require('minimist')(process.argv.slice(2));
const utils = require('./utils.js')

if (typeof argv.path === 'undefined' || typeof argv.port === 'undefined' || typeof argv.username === 'undefined' || typeof argv.password === 'undefined'){
    console.log("Please specify the required arguments to run the application");
    return
}

const server = dgram.createSocket('udp4');

/* Error event */
server.on('error', (err) => {
  console.log(`server error:\n${err.stack}`);
  server.close();
});

/* Accept an UDP packet and retransmit it using MQTT */
server.on('message', (msg, rinfo) => {
  console.log(`server got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  try {
    const data = JSON.parse(msg)
    if (typeof data.thingName === 'undefined'){
        // Error
        return
    }

    if(typeof data.auth == 'undefined'){
      // Missing auth
      return
    }

    utils.isValidCert(argv.path, data.thingName)
      .then(async () => {
        let verified = await utils.verifyMessage(data.auth, data.thingName, argv.path)
        if(verified== true){
          // Send response
          delete data.auth
          utils.sendMessage(data.thingName, data, argv.path)
        }
      })
      .catch(e => {
        utils.getCertificate(argv.username, argv.password, data.thingName, argv.path)
        .then(async () => {
          let verified = await utils.verifyMessage(data.auth, data.thingName, argv.path)
          if(verified == true){
            // Send response
            delete data.auth
            utils.sendMessage(data.thingName, data, argv.path)
          }
        })
      })
  } catch(e) {
    console.log("Error occured: ", e)
  }
});

/* Listen event */
server.on('listening', () => {
  const address = server.address();
  console.log(`server listening ${address.address}:${address.port}`);
});

server.bind(argv.port, "localhost");
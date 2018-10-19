const mic = require('mic-sdk-js').default
const fs = require('fs')
const AdmZip = require('adm-zip')
const awsIot = require('aws-iot-device-sdk')
const crypto = require('crypto')

const fixPath = str => {
  if (str.substr(-1) === '/')
    return str.substr(0, str.length - 1)
  return str
}

module.exports = {

  /* Check if certificate exists in specified
   * folder. Throw exception if not found.
   */
  isValidCert: async (pathToDir, thingName) => {
    return new Promise((resolve, reject) => {
      const path = fixPath(pathToDir)
      fs.access(`${path}/${thingName}`, fs.constants.F_OK, err => {
        if(err) {
          reject()
        } else {
          resolve()
        }
      })
    })
  },

  /* Verify incoming md5 hash with stored certificate md5 hash.
   */
  verifyMessage: (hash, thingName, path) => {
    return new Promise((resolve, reject) => {
      try {
        // Non-existing hash
        if (hash === null || hash === '') {
          resolve(false)
          return
        }

        // Read stored certificate md5 hash
        fs.readFile(`${fixPath(path)}/${thingName}/pubkey.pem`, (err, data) => {
          const match = crypto.createHash('md5').update(data).digest('hex')
          
          // Verify that Thing hash and local hash are the same
          if (String(hash).toLowerCase() === String(match).toLowerCase()) {
            resolve(true)
            return
          }

          // Not same
          resolve(false)
        })

      // Unknown error occured
      } catch(e) {
        reject(e)
      }
    })
  },

  /* Send MQTT message to MIC.
   */
  sendMessage: (thingName, payload, path) => {
    try {
      const device = awsIot.device({
        keyPath: `${fixPath(path)}/${thingName}/privkey.pem`,
        certPath: `${fixPath(path)}/${thingName}/cert.pem`,
        caPath: `${fixPath(path)}/ca.txt`,
        clientId: thingName,
        host: 'a3k7odshaiipe8.iot.eu-west-1.amazonaws.com'
      })

      device.on('connect', () => {
        const topic = `$aws/things/${thingName}/shadow/update`
        const message = {
          state: {
            reported: {
              ...payload
            }
          }
        }

        // Publish and disconnect
        device.publish(topic, JSON.stringify(message), (err) => {
          if (err) {
            console.log('Error during MQTT publish:', err.toString())
          }
          console.log('%s\x1b[32m%s\x1b[0m%s', '\t⮡ sucessfully relayed ', JSON.stringify(message), ' to MIC')
          device.end()
        })
      })
    } catch (e) {
      console.log('Error during sendMessage:', e)
    }
  },

  /* Get new certificate from MIC */
  getCertificate: (username, password, thingName, path) => {
    return new Promise((resolve, reject) => {
      const api = new mic
      api.init('startiot.mic.telenorconnexion.com')
        .then((manifest, credentials) => {
          api.login(username, password)
            .then(user => {
              const payload = {
                action: 'DOWNLOAD_CERTIFICATE',
                attributes: { thingName }
              }

              api.invoke('ThingLambda', payload)
                .then(data => {
                  fs.writeFile(`${fixPath(path)}/${thingName}.zip`, Buffer.from(data, 'base64'), err => {
                    if (err) {
                      console.log(err)
                      return
                    }

                    // Unzip the file
                    let zip = new AdmZip(`${fixPath(path)}/${thingName}.zip`)
                    zip.extractAllTo(`${fixPath(path)}/`, true)

                    /* Delete tmp zip */
                    fs.unlink(`${fixPath(path)}/${thingName}.zip`, (err) => {
                      if (err)
                        console.log(err)
                    })

                    resolve()
                  })
                })
                .catch(e => {
                  console.log(e)
                  reject(e)
                })
            })
            .catch(e => {
              console.log(e)
              reject(e)
            })
        })
        .catch(e => {
          console.log(e)
          reject(e)
        })
    })
  }
}

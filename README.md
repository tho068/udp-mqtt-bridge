# Nb-IoT UDP to Telenor Managed IoT Cloud bridge

UDP to Mqtt bridge for Telenor Managed IoT Cloud

## Getting started

### Installing the required npm modules

npm install

### Starting the application

node index.js --username "mic username" --password "mic password" --port "udp port" --path "path to cert folder"
  
### Sending authenticated messages

Send a JSON payload containing the following required parameteres

```javascript
{
  "auth": "MD5 hash of public key",
  "thingName": "MIC thing name",
  ...optionalParams
}
```

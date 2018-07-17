var PORT = 8085;
var HOST = '127.0.0.1';

var dgram = require('dgram');
var message = new Buffer(JSON.stringify({thingName: '00001511', temp: 26, hum: 33, auth: 'ba0bdc0e32cf508420af18db374b9b30'}));

var client = dgram.createSocket('udp4');
client.send(message, 0, message.length, PORT, HOST, function(err, bytes) {
    if (err) console.log(err)
    console.log('UDP message sent to ' + HOST +':'+ PORT);
    client.close();
});
var mqtt = require('mqtt')
var clientId = 'mqttjs_' + Math.random().toString(16).substr(2, 8)
console.log("executed once")
var options = {
  keepalive: 30,
  clientId: clientId,
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  will: {
    topic: 'WillMsg',
    payload: 'Connection Closed abnormally..!',
    qos: 0,
    retain: false
  },
  rejectUnauthorized: false
}
const host = 'ws://127.0.0.1:8080'
const client = mqtt.connect(host, options);


client.on('error', function (err) {
    console.log("MQTT error: ", err)
    client.end()
  })

  client.on('connect', function () {
    console.log('MQTT client connected:' + clientId)
  })

export default client


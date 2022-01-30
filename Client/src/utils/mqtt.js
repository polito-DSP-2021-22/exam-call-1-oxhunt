var mqtt = require('mqtt')
var clientId = 'mqttjs_' + Math.random().toString(16).substr(2, 8)

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
const host = 'ws://127.0.0.1:8086'
const client = mqtt.connect(host, options);
const subscriptions = []
const isSelectionTopic = RegExp("tasks/selection/")
const isPublicTopic = RegExp("tasks/public/")
let subscribedToPublic = false

/*
const unsubscribe = () => {
  if (subscriptions.length > 0) {
    const topic = subscriptions.pop();
    console.log("Unsubscribing from: " + topic)
    client.unsubscribe(topic);
    unsubscribe();
  }
}
*/
const removeItem = (array, value)=> {
  var index = array.indexOf(value);
  if (index !== -1) {
    array.splice(index, 1);
  }
}


const differentialSubscribe = (tasks, topic) => {
  const requiredSubscriptions = tasks.map(t => topic + t.tid)
  // get list of unnecessary subscriptions
  const unsubscribeList = subscriptions.filter(s => !requiredSubscriptions.includes(s))
  // get list of all new necessary subscriptions
  const subscribeList = requiredSubscriptions.filter(s => !subscriptions.includes(s))
  //console.log("subscribelist: ", subscribeList, "\n unsubscribelist :", unsubscribeList)
  //console.log("subscriptions: ", subscriptions, "\n requiredSubscriptions :", requiredSubscriptions)
  // remove all unnecessary subscriptions
  unsubscribeList.forEach(s => {
    client.unsubscribe(s, { qos: 0, retain: true }, (err, granted) => {
      if (err) console.log("error:", err, ", granted: ", granted)
    })
    console.log("unsubscribing from: ", s)
    removeItem(subscriptions, s)
  })

  // add all necessary subscriptions
  subscribeList.forEach(s => {
    client.subscribe(s, { qos: 0, retain: true }, (err, granted) => {
      if (!err) console.log("subscribed", granted[0])
      if (err) console.log("error:", err, ", granted: ", granted)
    })
    subscriptions.push(s)
  })
}

const subscribeToAll = (action, topic) => {
  if(subscribedToPublic && action)return;
  if(!subscribedToPublic && !action)return;
  if(action){
    client.subscribe(topic + "#", { qos: 0, retain: true }, (err, granted) => {
      if (!err) console.log("subscribed", granted[0])
      if (err) console.log("error:", err, ", granted: ", granted)
    })
    subscribedToPublic=true
  }
  else{
    console.log("unsubscribed from " + topic + "#")
    client.unsubscribe(topic + "#", { qos: 0, retain: true })
    subscribedToPublic=false
  }
}
const MQTTObject = (displayTaskSelection, updatePublicTasksInfo) => {


  client.on('error', function (err) {
    console.log("MQTT error: ", err)
    client.end()
  })

  client.on('connect', function () {
    console.log('MQTT client connected:' + clientId)
  })
  client.on('message', (topic, message) => {
    try {
      var parsedMessage = JSON.parse(message);
      //console.log("MQTT received message: ", parsedMessage, ", in topic: ", topic)
      if (isSelectionTopic.test(topic)) {
        if (parsedMessage.status === "deleted") {
          client.unsubscribe(topic);
          return
        }
        displayTaskSelection(topic, parsedMessage);
      }
      else if (isPublicTopic.test(topic)) updatePublicTasksInfo(topic, parsedMessage)
    } catch (e) {
      console.log(e);
    }
  })
}



export default MQTTObject
export { subscribeToAll, differentialSubscribe }

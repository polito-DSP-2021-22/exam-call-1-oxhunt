'use strict'

const mqtt = require('mqtt');
const taskDao = require('../dao/task');
const userDao = require('../dao/user')
const MQTTTaskMessage = require('./mqtt_task_message.js');

const host = 'ws://127.0.0.1:8080';
const clientId = 'mqttjs_' + Math.random().toString(16).substr(2, 8);

const options = {
  keepalive: 30,
  clientId: clientId,
  clean: true,
  reconnectPeriod: 60000,
  connectTimeout: 30 * 1000,
  will: {
    topic: 'WillMsg',
    payload: 'Connection Closed abnormally..!',
    qos: 0,
    retain: false
  },
  rejectUnauthorized: false
};
const mqtt_connection = mqtt.connect(host, options);

/*
const taskMessageMap = new Map();
*/
exports.mqttToDo = function () {

  /*
    //selectTask
    //publish the MQTT message for the selected task
    const message = new MQTTTaskMessage("active", parseInt(userId), rows2[0].name);
    mqtt.saveMessage(taskId, message);
    mqtt.publishTaskMessage(taskId, message);
  
    //publish the MQTT message for the selected task
    if(deselected){
        var message = new MQTTTaskMessage("inactive", null, null);
        mqtt.saveMessage(deselected, message);
        mqtt.publishTaskMessage(deselected, message);
    }
  
  
    // create new task
    //Creation of a new MQTT message for the created task
    var message = new MQTTTaskMessage("inactive", null, null);
    mqtt.saveMessage(this.lastID, message);
    mqtt.publishTaskMessage(this.lastID, message);
  
  
    //delete task
    //Delete the corresponding MQTT message
    mqtt.publishTaskMessage(taskId, new MQTTTaskMessage("deleted", null, null));
    //mqtt.publishTaskMessage(taskId, null); //uncomment if we want to clear the last retained message
    mqtt.deleteMessage(taskId);
  
    */
}

mqtt_connection.on('error', function (err) {
  console.log(err)
  mqtt_connection.end()
})

//When the connection with the MQTT broker is established, a retained message for each task is sent
mqtt_connection.on('connect', async function () {
  console.log('client connected:' + clientId)


  try {
    // get all users who have an active task
    const selectedTasks = (await userDao.getUsers())
      .filter(u => u.activeTask)
      .map(t => { return { tid: t.activeTask, username: t.name, userId: t.aid } })
    console.log(selectedTasks)
    
    // I add the missing tasks, which are all inactive
    const tasks = (await taskDao.getAllExistingTasks())
    .map(t => {
      const selection = selectedTasks.filter(st=>st.tid == t.tid)
      if(selection.length>0){
        return selection[0];
      }
      else return {tid:t.tid}
    })

    //for each taskid(which is the topic), i send the related assignment info
    tasks.forEach(function (selection) {
      const status = (selection.userId) ? "active" : "inactive";
      const message = new MQTTTaskMessage(status, selection.userId, selection.username);
      //taskMessageMap.set(selection.tid, message);
      console.log("mqtt publish, topic: ", selection.tid, ", message: ", JSON.stringify(message))
      mqtt_connection.publish(String(selection.tid), JSON.stringify(message), { qos: 0, retain: true });
    });
  }
  catch (e) {
    console.log("mqtt: error occurred during connection: ", e)
    mqtt_connection.end();
  }
})
mqtt_connection.on('reconnect', () => {
  console.log("Reconnecting...")
})

mqtt_connection.on('close', function () {
  console.log(clientId + ' disconnected');
})

module.exports.publishTaskMessage = function publishTaskMessage(taskId, message) {
  console.log("publishing message MQTT: ", taskId, ", ", message)
  mqtt_connection.publish(String(taskId), JSON.stringify(message), { qos: 0, retain: true })
};

module.exports.saveMessage = function saveMessage(taskId, message) {
  console.log("saveMessage from MQTTMap: ", taskId, ", message: ", message)
  //taskMessageMap.set(taskId, message);
};

module.exports.getMessage = function getMessage(taskId) {
  console.log("getMessage from MQTTMap: ", taskId)
  //taskMessageMap.get(taskId);
};

module.exports.deleteMessage = function deleteMessage(taskId) {
  console.log("deleting from MQTTMap: ", taskId)
  //taskMessageMap.delete(taskId);
};
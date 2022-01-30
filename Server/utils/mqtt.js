'use strict'

const mqtt = require('mqtt');
const taskDao = require('../dao/task');
const userDao = require('../dao/user')
const { MQTTPublicTaskMessage, MQTTSelectionMessage } = require('./mqtt_task_message.js');

const host = 'ws://127.0.0.1:8086';
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


async function uploadTaskSelectionsInfo(userDao, taskDao) {
  // get all users who have an active task


  const selectedTasks = (await userDao.getUsers())
    .filter(u => u.activeTask)
    .map(t => { return { tid: t.activeTask, username: t.name, userId: t.aid } })
  console.log(selectedTasks)

  // I add the missing tasks, which are all inactive
  const tasks = (await taskDao.getAllExistingTasks())
    .map(t => {
      const selection = selectedTasks.filter(st => st.tid == t.tid)
      if (selection.length > 0) {
        return selection[0];
      }
      else return { tid: t.tid }
    })
  //for each topic, i send the related assignment info
  tasks.forEach(function (selection) {
    const topic = "tasks/selection/" + selection.tid;
    const status = (selection.userId) ? "active" : "inactive";
    const message = new MQTTSelectionMessage(status, selection.userId, selection.username);
    //taskMessageMap.set(selection.tid, message);
    console.log("mqtt publish, topic: ", "tasks/selection/"+selection.tid, ", message: ", JSON.stringify(message))
    mqtt_connection.publish(topic, JSON.stringify(message), { qos: 0, retain: true });
  });
}

mqtt_connection.on('error', function (err) {
  console.log(err)
  mqtt_connection.end()
})

//When the connection with the MQTT broker is established, a retained message for each task is sent
mqtt_connection.on('connect', function () {
  console.log('client connected:' + clientId)


  try {
    uploadTaskSelectionsInfo(userDao, taskDao)
    //there is no need to upload the initial public tasks here given that they are already known, by the client
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

module.exports.publishTaskMessage = function publishTaskMessage(topic, message, retain) {
  console.log("publishing message MQTT: ", topic, ", ", message)
  mqtt_connection.publish(topic, JSON.stringify(message), { qos: 0, retain: retain})
};

module.exports.deletion = function (tid, isPublic) {
  console.log("mqtt,deletion")
  module.exports.publishTaskMessage("tasks/selection/" + tid, new MQTTSelectionMessage("deleted", null, null), true);
  //module.exports.publishTaskMessage("tasks/" + tid + "/selection", null); //uncomment if we want to clear the last retained message

  // if the deleted task was public, publish it
  if (isPublic) {
    const message = new MQTTPublicTaskMessage("deletion", {})
    module.exports.publishTaskMessage("tasks/public/" + tid, message, false);
  }
}

module.exports.completion = async function (tid, uid) {
  console.log("mqtt,completion, to implement")

  // if the newly completed task is public, publish it
  try {
    taskDao.getTaskById(tid, uid)
      .then(body => {
        const message = new MQTTPublicTaskMessage("update", body)
        module.exports.publishTaskMessage("tasks/public/" + tid, message, false);
      })
  }
  catch (e) {

  }
}

module.exports.creation = function (tid, body) {
  console.log("mqtt,creation")

  //publish a new inactive selection
  let message = new MQTTSelectionMessage("inactive", null, null);
  module.exports.publishTaskMessage("tasks/selection/" + tid, message, true);

  // if the newly created task is public, publish it
  if (body.private) return;
  body.tid = tid;
  message = new MQTTPublicTaskMessage("creation", body)
  module.exports.publishTaskMessage("tasks/public/" + tid, message, false);
}

module.exports.update = function (tid, body) {
  console.log("mqtt,update")
  // if the newly created task is public, or has changed from public to private publish it
  if (body.private) return module.exports.deletion(tid, true);
  const message = new MQTTPublicTaskMessage("update", { ...body, tid: tid })
  module.exports.publishTaskMessage("tasks/public/" + tid, message,false);
}

module.exports.taskSelection = function (tid, userId, username, status) {
  const message = new MQTTSelectionMessage(status, userId, username);

  module.exports.publishTaskMessage("tasks/selection/" +tid, message, true);
}
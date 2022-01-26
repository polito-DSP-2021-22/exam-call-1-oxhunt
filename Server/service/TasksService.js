'use strict';
const taskDao = require('../dao/task'); // module for accessing the tasks in the DB
const mqtt = require('../utils/mqtt');
const MQTTTaskMessage = require('../utils/mqtt_task_message.js');

/**
 * used to set a task status to completed, only an assignee of the task can perform it
 *
 * tid Integer Id of the task
 * no response value expected for this operation
 **/
exports.completeTask = async function (uid, tid) {
  console.log("insideCompleteTaskService")//delete this
  //completing the task
  return await taskDao.completeTask(uid, tid)
    .then(() => {
      return new Promise((resolve, reject) => resolve())
    })
    .catch((err) => {
      console.log("an error occurred in service tasks")
      return new Promise((resolve, reject) => reject(err, 500))
    });
}




/**
 * deletes a task with the given task id, can only be done by its owner
 *
 * tid Integer Id of the task
 * no response value expected for this operation
 **/
exports.deleteTaskById = async function (uid, tid) {
  return await taskDao.deleteTask(tid, uid)
    .then(() => {
      mqtt.publishTaskMessage(tid, new MQTTTaskMessage("deleted", null, null));
      mqtt.publishTaskMessage(taskId, null); //uncomment if we want to clear the last retained message
      mqtt.deleteMessage(tid);
      return new Promise((resolve, reject) => resolve())
    })
    .catch((err) => {
      console.log("an error occurred in service tasks")
      return new Promise((resolve, reject) => reject(err, 500))
    });
}


/**
 * returns a task with the given task id
 *
 * tid Integer Id of the task
 * returns task
 **/
exports.getTaskById = async function (uid, tid) {
  return await taskDao.getTaskById(tid, uid)
    .then((task) => {
      if (!task) return new Promise((resolve, reject) => resolve("No Task Found", 404))
      else return new Promise(function (resolve, reject) {
        return resolve(task);
      })
    })
    .catch((err) => {
      console.log("an error occurred in service tasks")
      return new Promise((resolve, reject) => reject(err, 500))
    });
}


/**
 * returns an object containing all the tasks the current user is authorized to view
 *
 * page Integer Used to select the page number requested. The first page is page 1 (optional)
 * filter String Used to select the type of tasks(owned by the user, assigned to the user or only the public ones) (optional)
 * returns tasksPage
 **/
exports.getTasks = async function (user, page, filter) {
  try {
    let tasks;
    if (filter == "owned") tasks = await taskDao.getOwnedTasksList(user, page)
    else if (filter === "assigned") tasks = await taskDao.getAssignedTasksList(user, page)
    else if (filter === "public") tasks = await taskDao.getPublicTasksList(page)
    else tasks = await taskDao.getAllTasksList(user, page)
    return new Promise((resolve, reject) => { resolve(tasks) })
  }
  catch (e) {
    console.log("an error occurred in service tasks: ", error)
    return new Promise((resolve, reject) => reject(err, 500))
  }
}


/**
 * Used to create a new task as specified in the request body. It does not create a new task if another task with the exact same attributes except id already exists
 *
 * body Tasks_body
 * returns inline_response_200
 **/
exports.createTask = async function (body, uid) {
  return await taskDao.createTask(body, uid)
    .then((newTaskId) => {
      //Creation of a new MQTT message for the created task
      var message = new MQTTTaskMessage("inactive", null, null);
      mqtt.saveMessage(newTaskId, message);
      mqtt.publishTaskMessage(newTaskId, message);
      return new Promise((resolve, reject) => resolve({ href: "localhost:8080/tasks/" + newTaskId, rel: "createdTask" }))
    })
    .catch((err) => {
      console.log("an error occurred in service tasks", err)//delete this
      return new Promise((resolve, reject) => reject(err, 500))
    });
}



/**
 * updates a task with the given task id, can only be performed by its owner
 *
 * body NewTask  (optional)
 * tid Integer Id of the task
 * no response value expected for this operation
 **/
exports.updateTask = async function (body, uid, tid) {
  console.log("updating task:", tid, ", to these new values: ", body)//delete this
  return await taskDao.updateTask(tid, body, uid)
    .then(() => {
      return new Promise((resolve, reject) => resolve())
    })
    .catch((err) => {
      console.log("an error occurred in service tasks")
      return new Promise((resolve, reject) => reject(err, 500))
    });
}


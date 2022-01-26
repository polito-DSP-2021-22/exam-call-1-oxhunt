'use strict';
const taskDao = require('../dao/task'); // module for accessing the tasks in the DB
const userDao = require('../dao/user')
const protocol = require('../utils/protocol')
const mqtt = require('../utils/mqtt');
const MQTTTaskMessage = require('../utils/mqtt_task_message.js');

/**
 * Used by the owner of the task to add a new assignee to it
 *
 * tid Integer Id of the task to which an assignee needs to be added
 * aid Integer Id of the assignee who is assigned a task
 * no response value expected for this operation
 **/
exports.addNewAssigneeToTask = async function(tid,aid) {
  console.log("addNewAssigneeToTask: tid=", tid, ", aid= ", aid)//delete this
  return await taskDao.addAssigneeToTask(aid, tid)
    .then((res) => {
      console.log("gone through here")
      return new Promise((resolve,reject) => resolve())
    })
    .catch((err) => {
      console.log("an error occurred in service tasks")
      return new Promise((resolve,reject) => reject(err, 500))
    });
}


/**
 * Used by the owner of the task to delete an assignee from it
 *
 * aid Integer Id of the assignee
 * tid Integer Id of the task from which an assignee needs to be removed
 * no response value expected for this operation
 **/
exports.detachAssignee = async function(aid,tid) {
  try {
    let user = (await userDao.getUsers()).filter(u=>u.activeTask==tid)
    user = (user.length==0)?null:user[0]
    taskDao.removeAssigneeFromTask(aid, tid)
    .then(async () => {
      if(user){
        await userDao.setActiveTask(user.aid, null) // if the task was selected by a user, he deselects it
        protocol.delete(user) // tells it to the other users
      }
      return new Promise((resolve,reject) => resolve())
    })
    .catch((err) => {
      console.log("an error occurred in service tasks")
      return new Promise((resolve,reject) => reject(err, 500))
    });
  }
  catch (e) {
    console.log(e)
    utils.writeJson(res,"Internal Error",500)
  }
}


/**
 * Used by the owner of a task to get the list of assignees to which it is assigned
 *
 * tid Integer Id of the task
 * returns assignees
 **/
exports.getListAssignees = async function(uid, tid) {
  
  return await taskDao.getAssignees(uid,tid)
    .then((assignees) => {
      return new Promise((resolve, reject)=> {resolve(assignees)})})
    .catch((err) => {
      console.log("an error occurred in service tasks")
      return new Promise((resolve,reject) => reject(err, 500))
    });
}


'use strict';
const userDao = require('../dao/user'); // module for accessing the users in the DB

/**
 * returns an object containing all the Users in the service, only a logged user can perform it
 *
 * uid Integer Id of the user
 * returns assignee
 **/
exports.getUserById = async function (uid) {
  return await userDao.getUserById(uid)
    .then((user) => {
      return new Promise((resolve, reject) => { resolve(user) })
    })
    .catch((err) => {
      console.log("an error occurred in service user", err)
      return new Promise((resolve, reject) => reject(err))
    });
}


/**
 * returns an object containing all the Users in the service, only a logged user can perform it
 *
 * returns assignees
 **/
exports.getUsers = async function () {
  return await userDao.getUsers()
    .then((users) => {
      return new Promise((resolve, reject) => { resolve(users) })
    })
    .catch((err) => {
      console.log("an error occurred in service users", err)
      return new Promise((resolve, reject) => reject(err, 500))
    });
}


/**
 * used to set the active task for a given user, only an assignee of the task can perform it. If no request body is sent, the active task is set to NULL
 *
 * body Users_uid_body  (optional)
 * uid Integer Id of the user
 * no response value expected for this operation
 **/
exports.setActiveTask = async function (taskId, uid) {
  console.log("insideSetActiveTaskService, taskId: ", taskId, ", uid: ", uid)//delete this
  //completing the task
  try{
    await userDao.setActiveTask(uid, taskId)
    return new Promise((resolve, reject) => resolve())
  }
  catch(e){
    console.log("an error occurred in service tasks")
    return new Promise((resolve, reject) => reject(err, 500))
  }
}



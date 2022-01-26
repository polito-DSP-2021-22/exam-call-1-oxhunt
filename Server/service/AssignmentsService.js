'use strict';
const taskDao = require('../dao/task'); // module for accessing the tasks in the DB

/**
 * Used to automatically and evenly assign the tasks owned by the currently logged user
 *
 * returns inline_response_200
 **/
exports.autoAssign = async function (uid) {
  return await taskDao.autoAssignTasks(uid)
    .then(() => {
      return new Promise((resolve, reject) => resolve({ href: "localhost:8080/api/tasks?filter=owned", rel: "ownedTasks" }))
    })
    .catch((err) => {
      console.log("an error occurred in service tasks", err)//delete this
      return new Promise((resolve, reject) => reject(err, 500))
    })
}


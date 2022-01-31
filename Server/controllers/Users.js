'use strict';

var utils = require('../utils/writer.js');
var Users = require('../service/UsersService');
const setCookie = require('../utils/passport.js').setCookie
const taskDao = require('../dao/task.js')
const userDao = require('../dao/user.js')
const protocol = require('../utils/protocol')
const mqtt = require('../utils/mqtt');
const MQTTTaskMessage = require('../utils/mqtt_task_message.js');


module.exports.getUserById = function getUserById(req, res, next, uid) {
  if(!req.userOfCookie)return utils.writeJson(res, "You must be logged in to perform this action", 401);
  Users.getUserById(uid)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.getUsers = function getUsers(req, res, next) {
  if(!req.userOfCookie)return utils.writeJson(res, "You must be logged in to perform this action", 401);
  Users.getUsers()
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};



module.exports.login = async function session(req, res, next, body) {
  try {
    const user = await Users.getUserById(req.user.id)
    const task = (user.activeTask) ? await taskDao.getTaskById(user.activeTask, req.user.id) : null;
    console.log('req.user: ', req.user, ", user: ", user)
    const response = {
      id: user.aid,
      email: user.email,
      name: user.name,
    }
    if(user.activeTask)response.activeTask = user.activeTask
    protocol.login(user, task)
    res = setCookie(res, req.user.id) // setting the signed cookie in the answer
    utils.writeJson(res, response);
  }
  catch (response) {
    console.log("error occurred in login", response)
    utils.writeJson(res, response);
  }
};

module.exports.checkAuthorization = async function (req, res, next) {
  try {
    console.log(req.user)
    const user = await Users.getUserById(req.user)
    const task = (user.activeTask) ? await taskDao.getTaskById(user.activeTask, req.user.id) : null;
    const response = {
      id: user.aid,
      email: user.email,
      name: user.name,
      activeTask: user.activeTask
    }
    protocol.login(user, task)
    utils.writeJson(res, response);
  }
  catch (response) {
    console.log("error occurred in check Authorization", response)
    utils.writeJson(res, response);
  }
}

module.exports.logout = async function session(req, res, next, body) {
  console.log(req.user)
  try {
    protocol.logout(req.user)
    req.logout();
    res.clearCookie('jwt');
    utils.writeJson(res);

  }
  catch (response) {
    console.log("error occurred at logout", response)
    utils.writeJson(res, response);
  }
};


module.exports.setActiveTask = async function setActiveTask(req, res, next, body, uid) {

  console.log("req.userOfCookie: ", req.userOfCookie, ", taskid: ", body.taskId, "uid: ", uid)
  if (req.userOfCookie != uid) {
    utils.writeJson(res, "You cannot set the active task of another user", 401)
    return;
  }
  try {
    if (await taskDao.isAssignee(uid, body.taskId)) {
      try {
        console.log(1)
        const task = await taskDao.getTaskById(body.taskId, uid);
        const user = await userDao.getUserById(uid)
        console.log(2)
        if (user.activeTask) {
          //publish the MQTT message for the selected task
          mqtt.taskSelection(user.activeTask, null,null, "inactive")
        }
        console.log(3)
        Users.setActiveTask(body.taskId, uid)
          .then((response) => {
            mqtt.taskSelection(body.taskId,user.aid, user.name, "active")
            console.log(4)

            protocol.update(user, task)
            console.log(5)
            utils.writeJson(res, response);
          })

      }
      catch (e) {
        console.log("error occurred: ", e)
        utils.writeJson(res, "Internal Server Error", 500)
      }
    }
  }
  catch (e) {
    console.log("error occurred: ", e)
    utils.writeJson(res, "Only logged in users to whom this task has been assigned can perform this operation", 401)
  }
};
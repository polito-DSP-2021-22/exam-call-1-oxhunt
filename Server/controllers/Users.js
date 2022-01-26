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
  Users.getUserById(uid)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.getUsers = function getUsers(req, res, next) {
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
    const task = (user.activeTask)?await taskDao.getTaskById(user.activeTask, req.user.id):null;
    console.log('req.user: ', req.user, ", user: ", user)
    const response = {
      id:user.aid,
      email:user.email,
      name:user.name,
      activeTask:user.activeTask
    }
    protocol.login(user, task)
    res = setCookie(res, req.user.id) // setting the signed cookie in the answer
    utils.writeJson(res, response);
  }
  catch (response) {
    console.log("error occurred in login", response)
    utils.writeJson(res, response);
  }
};

module.exports.checkAuthorization = async function(req,res, next){
  try {
    console.log(req.user)
    const user = await Users.getUserById(req.user)
    const task = (user.activeTask)?await taskDao.getTaskById(user.activeTask, req.user.id):null;
    const response = {
      id:user.aid,
      email:user.email,
      name:user.name,
      activeTask:user.activeTask
    }
    
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

  console.log("req.userOfCookie: ", req.userOfCookie, ", taskid: ", body.TaskId, "uid: ", uid)
  if (req.userOfCookie != uid) {
    utils.writeJson(res, "You cannot set the active task of another user", 401)
    return;
  }
  try {
    if (await taskDao.isAssignee(uid, body.TaskId)) {
      try {

        const task = await taskDao.getTaskById(body.TaskId, uid);
        const user = await userDao.getUserById(uid)

        if(user.activeTask){
          //publish the MQTT message for the selected task
            var message = new MQTTTaskMessage("inactive", null, null);
            mqtt.saveMessage(user.activeTask, message);
            mqtt.publishTaskMessage(user.activeTask, message);
        }

        Users.setActiveTask(body.TaskId, uid)
          .then((response) => {
            const message = new MQTTTaskMessage("active", user.aid, user.name);
            mqtt.saveMessage(body.TaskId, message);
            mqtt.publishTaskMessage(body.TaskId, message);
          
            protocol.update(user, task)
            utils.writeJson(res, response);
          })

      }
      catch (e) {
        utils.writeJson(res, "Internal Server Error", 500)
      }
    }
  }
  catch (e) {
    utils.writeJson(res, response)
  }
};
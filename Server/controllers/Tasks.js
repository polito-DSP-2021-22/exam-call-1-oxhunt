'use strict';

var utils = require('../utils/writer.js');
var Tasks = require('../service/TasksService');
const protocol = require('../utils/protocol')
const userDao = require('../dao/user')


module.exports.completeTask = function completeTask(req, res, next, tid) {
  console.log("completing task:", tid, ", by assignee:", req.user)
  Tasks.completeTask(req.user, tid)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.deleteTaskById = async function deleteTaskById(req, res, next, tid) {
  try {
    let user = (await userDao.getUsers()).filter(u => u.activeTask == tid)
    user = (user.length == 0) ? null : user[0]
    Tasks.deleteTaskById(req.user, tid)
      .then(async function (response) {
        if (user) {
          await userDao.setActiveTask(user.aid, null) // if the task was selected by a user, he deselects it
          protocol.delete(user) // tells it to the other users
        }
        utils.writeJson(res, response);
      })
      .catch(function (response) {
        utils.writeJson(res, response);
      });
  }
  catch (e) {
    console.log(e)
    utils.writeJson(res, "Internal Error", 500)
  }

};

module.exports.getTaskById = function getTaskById(req, res, next, tid) {
  Tasks.getTaskById(req.user, tid)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.getTasks = function getTasks(req, res, next, page, filter) {
  Tasks.getTasks(req.userOfCookie, page, filter)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.createTask = function createTask(req, res, next, body) {
  console.log("body: ", body)
  Tasks.createTask(body, req.user)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.updateTask = async function updateTask(req, res, next, body, tid) {
  try {
    let user = (await userDao.getUsers()).filter(u => u.activeTask == tid)
    user = (user.length == 0) ? null : user[0]
    Tasks.updateTask(body, req.user, tid)
      .then((response) => {
        if (user) protocol.update(user, body) // if the task was selected by a user, he is assigned to the modified task
        return utils.writeJson(res, response);
      })
      .catch((e) => {
        return utils.writeJson(res, e)
      })
  }
  catch (e) {
    console.log(e)
    utils.writeJson(res, "Internal Error", 500)
  }
};

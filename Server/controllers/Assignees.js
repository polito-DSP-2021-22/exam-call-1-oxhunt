'use strict';

var utils = require('../utils/writer.js');
var Assignees = require('../service/AssigneesService');


module.exports.addNewAssigneeToTask = function addNewAssigneeToTask (req, res, next, aid, tid) {
  console.log("adding new assignee to task: aid:", aid, ", tid:", tid)
  Assignees.addNewAssigneeToTask(aid, tid)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.detachAssignee = function detachAssignee (req, res, next, tid, aid) {
  Assignees.detachAssignee(aid, tid)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      console.log("error: ", response)
      utils.writeJson(res, response);
    });
};

module.exports.getListAssignees = function getListAssignees (req, res, next, tid) {
  
  Assignees.getListAssignees(req.user,tid)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      console.log("response: ", response)
      utils.writeJson(res, response);
    });
};

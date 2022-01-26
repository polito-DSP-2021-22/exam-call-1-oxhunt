'use strict';

var utils = require('../utils/writer.js');
var Assignments = require('../service/AssignmentsService');

module.exports.autoAssign = function autoAssign (req, res, next) {
  Assignments.autoAssign(req.user)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

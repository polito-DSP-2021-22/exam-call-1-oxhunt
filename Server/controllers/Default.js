'use strict';

var utils = require('../utils/writer.js');
var Default = require('../service/DefaultService');


module.exports.getIndex = function getIndex (req, res, next) {
  Default.getIndex(req.userOfCookie)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      console.log("error: ", response)
      utils.writeJson(res, response);
    });
};
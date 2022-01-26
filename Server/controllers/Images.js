'use strict';

var utils = require('../utils/writer.js');
var Images = require('../service/ImagesService');

module.exports.addImageToTask = function addImageToTask(req, res, next, image, tid) {
  Images.addImageToTask(tid, req.files[0])
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.deleteImageFromTask = function deleteImageFromTask(req, res, next, tid, iid) {
  Images.deleteImageFromTask(tid, iid)
    .then(function (response) {
      utils.writeJson(res, response);
    })
    .catch(function (response) {
      utils.writeJson(res, response);
    });
};

module.exports.getImageFromTask = function getImageFromTask(req, res, next, tid, iid) {
  Images.getImageFromTask(tid, iid, req.headers.accept, res)
    .then(function (response) {
      if(response === "waiting for image from server")return;
      console.log(response.image)
      res.set('Content-Type', response.mimetype)
      return res.send(response.image);
    })
    .catch(function (response) {
      return utils.writeJson(res, response);
    });
};

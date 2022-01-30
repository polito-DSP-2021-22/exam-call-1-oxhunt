'use strict';
const taskDao = require('../dao/task'); // module for accessing the tasks in the DB
const conversion = require('../utils/conversion')

/**
 * Used to attach an image to task. It does not create a new task if another image equal to it, is already attached, it doesn't attach it(idempotent)
 *
 * tid Integer Task Id
 * returns inline_response_200_1
 **/
exports.addImageToTask = async function (tid, image) {
  console.log(tid)//delete this
  return await taskDao.addImageToTask(tid, image)
    .then((res) => {
      return new Promise((resolve, reject) => resolve(res))
    })
    .catch((err) => {
      console.log("an error occurred in service images")
      return new Promise((resolve, reject) => reject(err, 500))
    });
}


/**
 * Used to delete an image from a task. Can only be performed by an owner of that task
 *
 * tid Integer Task Id
 * iid Integer Image Id
 * no response value expected for this operation
 **/
exports.deleteImageFromTask = async function (tid, iid) {
  return await taskDao.deleteImageFromTask(tid, iid)
    .then(() => {
      return new Promise((resolve, reject) => resolve())
    })
    .catch((err) => {
      console.log("an error occurred in service tasks")
      return new Promise((resolve, reject) => reject(err, 500))
    });
}


/**
 * Used to get an image from a task. Can only be performed by either an owner or an assignee of that task
 *
 * tid Integer Task Id
 * iid Integer Image Id
 * returns inline_response_200
 **/
exports.getImageFromTask = async function (tid, iid, mimetype, res) {
  console.log(tid)//delete this
  return await taskDao.getImageById(tid, iid)
    .then((resp) => {
      console.log(resp)
      if (!resp) {
        return new Promise((resolve, reject) => resolve(null))
      }
      if (mimetype === resp.mimetype) {
        console.log("image sent")
        return new Promise((resolve, reject) => resolve(resp))
      }
      else {
        const request = {
          file: resp.image,
          meta: {
            file_type_origin: resp.mimetype.split('/')[1],
            file_type_target: mimetype.split('/')[1]
          }
        }
        conversion.fileConvert(request, res)
        return new Promise((resolve, reject) => resolve("waiting for image from server"))
      }
      
    })
    .catch((err) => {
      console.log("an error occurred in service images", err)
      return new Promise((resolve, reject) => reject(err, 500))
    });
}


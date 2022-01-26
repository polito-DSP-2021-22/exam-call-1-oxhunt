const taskDao = require('../dao/task')
const userDao = require('../dao/user')
var utils = require('./writer.js');

const cookieExtractor = function (req) {
    console.log("inside cookie extractor")//delete this
    var token = null;
    if (req && req.cookies) {
        token = req.cookies['jwt']
    }
    return token
}


exports.taskIsActiveForAnotherUser = (req, res, next) => {
    const uid = req.openapi.pathParams.uid;
    const tid = req.openapi.swaggerParameters[3].TaskId
    console.log("inside taskIsActiveForAnotherUser: uid:", uid, ", tid:", tid)//delete this
    if (!tid || !uid) return next()
    userDao.getUsers()
        .then((users) => {
            users = users.filter(u=> u.activeTask===tid)
            //console.log("taskIsActiveForAnotherUser: ", users)
            
            if(users.length>1){
                console.log("WARNING: there is an internal inconsistency in the database, only one user can be active on task: ", tid, " at the same time")
                return utils.writeJson(res, "A task can only be active for 1 user at a time", 409)
            }
            else if (users[0] && users[0].aid!=uid)return utils.writeJson(res, "A task can only be active for 1 user at a time", 409)
            return next()
        }
        ).catch((error) => {
            return utils.writeJson(res, "Internal Error", 500)
        })
}

exports.first = (req, res, next) => {
    console.log("just a message for debugging purposes")
    console.log(req.user)
    return next()
}
exports.printBody = (req, res, next) => {
    console.log("req.params:", req.params)
    console.log("req.query:", req.query)
    console.log("req.cookies: ", cookieExtractor(req))
    console.log("printing body: ", req.body)
    return next()
}
exports.printStack = (req, res, next) => {
    console.log("app router stack", app._router.stack)
    next()
}
exports.taskExists = (req, res, next) => {
    const tid = req.openapi.pathParams.tid;
    console.log("inside taskExists")//delete this
    if (!tid) return next()
    taskDao.doesTaskExist(tid)
        .then(() => {
            return next()
        }
        ).catch((error) => {
            console.log("Task does not exist")
            const p = req.openapi.swaggerParameters[0];
            if (p.method === 'DELETE' && p.url === "/api/tasks/" + tid) {
                return utils.writeJson(res, "", 200)
            }
            return utils.writeJson(res, "Task Not Found", 404)
        })
}
exports.isAssignee = (req, res, next) => {
    console.log("inside MustBeAssignee")//delete this
    if (!req.openapi.pathParams.tid) return next();
    taskDao.isAssignee(req.user, req.openapi.pathParams.tid)
        .then(() => {
            return next()
        }
        ).catch(() => {
            console.log("The user is not an assignee of this task")
            return utils.writeJson(res, "You must be an assignee of this task to perform this action", 401)
        })
}
exports.isOwner = (req, res, next) => {
    if (!req.openapi.pathParams.tid) return next();
    taskDao.isOwner(req.user, req.openapi.pathParams.tid)
        .then(() => {
            console.log("the user is the owner: ", req.user, ", tid : ", req.openapi.pathParams.tid)
            return next()
        }
        ).catch(() => {
            console.log("That task does not belong to the user")
            return utils.writeJson(res, "You must be the owner of this task to perform this action", 401)
        })
}
exports.isEitherOwnerOrAssignee = (req, res, next) => {
    taskDao.isOwner(req.user, req.openapi.pathParams.tid)
        .then(() => {
            return next()
        }
        ).catch(() => {
            console.log("That task does not belong to the user")
            taskDao.isAssignee(req.user, req.openapi.pathParams.tid)
                .then(() => {
                    return next()
                }
                ).catch(() => {
                    return utils.writeJson(res, "You must either an assignee or the owner this task to perform this action", 401)
                })
        })
}

const multer = require('multer');
exports.upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024
  }
});
exports.middleware = (req, res, next) => {
  if (!req.files[0]) {
    return utils.writeJson(res, "You need to insert an image", 400)
  }
  console.log("middleware says: req.file: ", req.files[0])
  next()
}
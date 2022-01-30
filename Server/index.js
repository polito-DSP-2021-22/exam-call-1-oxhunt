'use strict';

var path = require('path');
var http = require('http');

var oas3Tools = require('oas3-tools');
var serverPort = 3001;

// swaggerRouter configuration
var options = {
    routing: {
        controllers: path.join(__dirname, './controllers')
    },
};

var expressAppConfig = oas3Tools.expressAppConfig(path.join(__dirname, 'api/openapi.yaml'), options);
var app = expressAppConfig.getApp();

// Initialize the Swagger middleware
http.createServer(app).listen(serverPort, function () {
    console.log('Your server is listening on port %d (http://localhost:%d)', serverPort, serverPort);
    console.log('Swagger-ui is available on http://localhost:%d/docs', serverPort);
});


//-------------------------------------------------------------------------------------------------------------
// Beginning Added Part
//----------------------------------------------------------------
//imported



const m = require('./utils/middlewares')
const passport = require('./utils/passport').passport

const identifyUser = require('./utils/passport').identifyUser;


console.log("OriginalStackLength: ", app._router.stack.length)
//extracting the last 3 elements of the stack
const n=2, lastElements=[];
for(let i=0; i<n; i++){
  lastElements[i]=app._router.stack.pop()
}


//app._router.mergeParams = true;
console.log("stackLengthAfterRemove: ", app._router.stack.length)


// then, init passport

app.use(passport.initialize());

//users/session
app.post("/api/users/session/", passport.authenticate('local'))
app.delete("/api/users/session/", passport.authenticate('jwt', { session: false }))
app.get("/api/users/session/", passport.authenticate('jwt', { session: false }))
//users
app.post("/api/users/:uid",  identifyUser, m.taskIsActiveForAnotherUser)
app.get("/api/users",  identifyUser)
app.get("/api/users/:uid",  identifyUser)
//tasks:tid
app.post("/api/tasks/:tid",  passport.authenticate('jwt', { session: false }),m.taskExists, m.isAssignee)
app.get("/api/tasks/:tid",  passport.authenticate('jwt', { session: false })) 
app.delete("/api/tasks/:tid",  passport.authenticate('jwt', { session: false }),m.taskExists, m.isOwner) 
app.put("/api/tasks/:tid",  passport.authenticate('jwt', { session: false }),m.taskExists, m.isOwner)
// tasks/:tid/assignees
app.get("/api/tasks/:tid/assignees",  passport.authenticate('jwt', { session: false }),m.taskExists, m.isOwner) 
app.post("/api/tasks/:tid/assignees/:aid",  passport.authenticate('jwt', { session: false }),m.taskExists, m.isOwner)
app.delete("/api/tasks/:tid/assignees/:aid", passport.authenticate('jwt', { session: false }), m.taskExists, m.isOwner) 
//tasks
app.get("/api/tasks", identifyUser);
app.post("/api/tasks",  passport.authenticate('jwt', { session: false }))
app.post("/api/tasks/assignments/",  passport.authenticate('jwt', { session: false }))
///tasks/:tid/images
app.get("/api/tasks/:tid/images/:iid",  passport.authenticate('jwt', { session: false }),m.taskExists, m.isEitherOwnerOrAssignee, m.upload.single('image'))
app.post("/api/tasks/:tid/images",  passport.authenticate('jwt', { session: false }), m.taskExists, m.isOwner,  m.upload.single('image'))
app.delete("/api/tasks/:tid/images/:iid",  passport.authenticate('jwt', { session: false }), m.isOwner, m.taskExists, m.upload.single('image'))

app.get("/api/", identifyUser)

console.log("routerStackLengthBeforeAdd: ", app._router.stack.length)

// pushing again into the stack the last elements removed
for(let i=0; i<n; i++){
  app._router.stack.push(lastElements[n-1-i])
}
console.log("finalRouterStackLength: ", app._router.stack.length)


'use strict';

const WebSocket = require('ws');
var loginMessagesMap = new Map();


var wss = new WebSocket.Server({ port: 5000 })




wss.on('connection', ws => {
    //console.log("connection with client happened successfully")

    updateNewClient(ws);

    ws.on('message', message => {
        //do nothing, we create and send messages when client does an action
    })
    // When a socket closes, or disconnects, remove it from the array.
    ws.on('close', function () {
        //console.log("a client has disconnected the websocket")
        // when client websocket disconnects we don't do anything
    });
})

// sends the given message to all currently connected clients
module.exports.sendAllClients = function sendAllClients(message) {
    wss.clients.forEach(function each(client) {
        client.send(JSON.stringify(message));
      });
};

// prints the login map, used for debugging purposes
const printMap = (place) => {
    //console.log(place + ": printing ws message map")
    loginMessagesMap.forEach(x => console.log(x))
}

//used to send the new client the up-to-date list of active users and active tasks
const updateNewClient = (ws) => {
    printMap('new connection')
    loginMessagesMap.forEach((message) => {
        //console.log("ws.on connection, message: ", message)
        ws.send(JSON.stringify(message));
    });
}

// if necessary updates the login map, returns true if it does
module.exports.isUpdateOnLoginMessagesMap = (user, message)=>{
    const prevMessage = loginMessagesMap.get(user.aid)
    //console.log("prevMessage: ", prevMessage,",  user: ",  user, "message: ", message)
    if(prevMessage==undefined){ // the user whose selection has been modified is not online
        return false
    }
    else{
        loginMessagesMap.set(user.aid,message)
        return true
    }
}


module.exports.saveMessage = (userId, message) => {
    //console.log('saving message, user: ', userId,', ', message)
    loginMessagesMap.set(userId, message)
}

module.exports.getMessage = (userId) => {
    loginMessagesMap.get(userId);
}

module.exports.deleteMessage = (userId) => {
    loginMessagesMap.delete(userId);
    printMap('logout')
}
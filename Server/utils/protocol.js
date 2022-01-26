var WebSocket = require('../utils/websocket.js');
var WSMessage = require('../utils/ws_message.js');

module.exports.login = function(user, task){
    const loginMessage = new WSMessage('login', user.aid, user.name, task?task.tid:undefined, task?task.description:undefined);
    WebSocket.saveMessage(user.aid, loginMessage);
    WebSocket.sendAllClients(loginMessage);
}

module.exports.logout = function(userId){
    const logoutMessage = new WSMessage('logout', userId);
    WebSocket.deleteMessage(userId);
    WebSocket.sendAllClients(logoutMessage);
}

module.exports.update = function(user, task){
    const updateMessage = new WSMessage('update', user.aid, user.name, task.tid, task.description);
    if(WebSocket.isUpdateOnLoginMessagesMap(user, updateMessage)){
        WebSocket.sendAllClients(updateMessage);
    }
    //WebSocket.saveMessage(user.id, updateMessage);
}

module.exports.delete = function(user){
    const updateMessage = new WSMessage('update', user.aid, user.name, null, null);
    WebSocket.sendAllClients(updateMessage);
    WebSocket.saveMessage(user.aid, updateMessage);
}
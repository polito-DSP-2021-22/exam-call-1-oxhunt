class MQTTSelectionMessage {    
    constructor(status, userId, userName) {

        this.status = status;
        if(userId) this.userId = userId;
        if(userName) this.userName = userName;

    }
}

class MQTTPublicTaskMessage{
    constructor(operation,task){
        this.operation = operation,
        this.important = task.important,
        this.id = task.tid,
        this.description = task.description;
        this.private = task.private;
        this.deadline = task.deadline;
        this.project = task.project; 
        this.completed = task.completed
        //owner: { name: 'User', aid: 1, email: 'user.dsp@polito.it' } are useless because they can't change
    }
}

module.exports = {MQTTPublicTaskMessage, MQTTSelectionMessage};


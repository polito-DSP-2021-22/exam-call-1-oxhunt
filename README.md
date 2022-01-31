# Exam Call 1

The structure of this repository is the following:
  - "Client" contains the code of the REACT client implementation;
  - "Mosquitto Configuration" contains the Eclipse Mosquitto configuration file;
  - "REST APIs Design" contains the OpenAPI document describing the design of the REST APIs;
  - "Server" contains the code of the ToDoManager service application;
  - "Server/json_schemas" contains the design of the JSON Schemas.

## Design Choices about MQTT

### MQTT Topics:

- tasks/public/{tid} :
  - This topic is used to publish information on a public task with a given task id(tid).
  - The client subscribes to tasks/public/# in order to receive updates on all the public tasks.
  - There is no need to set any retain flag because when a new client connects it will get the fresh state of a page directly from a http request to the server. This mqtt topic structure is only used in order to mantain that data consistency in between different http requests.
  - I have set the Qos to 2 for this topic, because the client elaborates the mqtt messages in a way that is not completely idempotent. In particular, in order to keep the number of pages synchronized with the pages on the server, the client counts the amount of created and deleted tasks. If one can tolerate that the number of pages in the client may not be perfectly synchronized, he can set Qos to 1. On the other hand, setting Qos to zero may be a problem in case of an unreliable channel, because mqtt will give up sending the message if no tcp/websocket connection can be successfully executed, resulting in an unconsistent state until the next http request for a page.

- tasks/selection/{tid}:
  - This topic is used to transmit information on the current selected tasks and the users who selected them.
  - In my implementation, the client subscribes to tasks/public/{tid} addressing without using any wildcard, so as to minimize the scope of the topics he subscribes to.
  - Here the retain flag is very important since there is no REST API which the client can call in order to obtain the up-to-date state of the server. By setting the retained flag, as soon as a new client subscribes, he will receive a snapshot of the state of the server and after that, all the incremental changes.
  - Here I have changed the QoS from 0 to 1 compared to the solution of the lab 5 provided. This is because, especially in between broker and the ToDoManager service, if a message is lost, it may result in an inconsistent state, on all the clients. If changes on tasks happen very frequently and the quality of the channel good, this may be tolerable, but I think that setting QoS to 1, especially in between TodoManager and Broker. On the other hand setting QoS to 2 is unnecessary and puts only more load on the network, since the client mqtt API is completely idempotent.

### MQTT Messages

- [Schema for messages: tasks/public/{tid}](./Server/json_schemas/SchemaMQTTPublic.json)
  - Messages always contain the "operation" field, which specifies which action was performed on the task, the action can only be of 3 types: creation, deletion, update.
  - The id attribute for the task is listed but it is not strictly needed because it is always gettable from the topic.
  - In case of an update or creation operation, also the description field is compulsory.
  - I haven't included on purpose the value specifying the owner of the task because it is not needed in the public task view, and changing the view would also refresh all tasks in the client.
- [Schema for messages: tasks/selection/{tid}](./Server/json_schemas/SchemaMQTTSelection.json)
  - The schema has remained the same as for the Lab05 Solution.
  - In this message, all the values are required because they are all used to display the info in the onlineList.

### MQTT Configurations

- On all mqtt connections, I kept a 30 ms keepalive, 1s reconnectPeriod, and 30s as connectTimeout, I think they are a good default for this application.
- I kept the clean session to true for both topics seen before, because when the client connects, it is automatically updated on the latest state of the topic, either through the mqtt retained messages or through a http request. There was no need to use a session.
- The values of "will" are set as the default values of the Lab5 Solution, but it is never used by either the client or the server, so it is superfluos.
- Compared to the Lab5 Solution provided, I changed the channel between broker and server from websocket to tcp since there is no need to use websockets when the broker is connecting to a client which is not a browser.

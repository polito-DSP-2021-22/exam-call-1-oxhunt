/**
 * All the API calls
 */

import dayjs from 'dayjs';
import Task from './components/Task';
import User from './components/User';


const BASEURL = '/api/';




function getJson(httpResponsePromise) {
  return new Promise((resolve, reject) => {
    httpResponsePromise
      .then((response) => {
        if (response.ok) {

          // always return {} from server, never null or non json, otherwise it will fail
          response.json()
            .then(json => resolve(json))
            .catch(err => reject({ error: "Cannot parse server response" }))

        } else {
          // analyze the cause of error
          response.json()
            .then(obj => reject(obj)) // error msg in the response body
            .catch(err => reject({ error: "Cannot parse server response" })) // something else
        }
      })
      .catch(err => reject({ error: "Cannot communicate" })) // connection error
  });
}

const getTasks = async (filter, page) => {
  let url = BASEURL + '/tasks' + ((filter) ? "?filter=" + filter : "")

  const extension = "&page=" + page;
  if (extension !== "&page=undefined" && extension !== "&page=null") url += extension;
  return getJson(
    fetch(url)
  ).then(json => {

    const tasks = json.pageItems.map((task) => Object.assign({}, task,
      { deadline: task.deadline && dayjs(task.deadline) },
      { id: task.tid }
    ));

    localStorage.setItem('totalPages', json.totalPages);
    localStorage.setItem('currentPage', json.pageNumber);
    localStorage.setItem('totalItems', json.totalItems);
    localStorage.setItem('maxSizePage', json.maxItemsPerPage)

    return tasks
  })
}


const getPublicTasks = async (page) => {
  if (page === undefined) page = 0;

  let url = BASEURL + 'tasks?filter=public';
  if (page) {
    url += "&page=" + page;
  }

  return getJson(
    fetch(url)
  ).then(json => {

    const tasks = json.pageItems.map((task) => Object.assign({}, task,
      { deadline: task.deadline && dayjs(task.deadline) },
      { id: task.tid }
    ));

    localStorage.setItem('totalPages', json.totalPages);
    localStorage.setItem('currentPage', json.pageNumber);
    localStorage.setItem('totalItems', json.totalItems);
    localStorage.setItem('maxSizePage', json.maxItemsPerPage)
    

    return tasks
  })

}



async function getAllOwnedTasks() {

  console.log("getAllOwnedTasks") /*delete this*/

  let url = BASEURL + '/tasks?filter=owned';
  let allTasks = [];
  let finished = false;

  while (!finished) {
    const response = await fetch(url);
    const responseJson = await response.json();
    const tasksJson = responseJson.pageItems;
    const links = responseJson.links;
    if (response.ok) {
      tasksJson.forEach(
        (t) => {
          let task = new Task(t.tid, t.description, t.important, t.private, t.deadline, t.project, t.completed);
          allTasks.push(task);
        }
      );
      let next = links.filter(l => l.rel === "next")[0]; // i take the value of the link called "next"

      if (!next) {
        finished = true;
      } else {
        url = next.href;
      }

    } else {
      let err = { status: response.status, errObj: tasksJson };
      throw err; // An object with the error coming from the server
    }

  }

  return allTasks;

}

function addTask(task) {
  task.important = task.important ? 1 : 0;
  task.private = task.private ? 1 : 0;
  console.log("addTask: ") /*delete this*/
  return getJson(
    fetch(BASEURL + "/tasks", {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...task, completed: false })
    })
  )
}

function updateTask(task) {
  console.log("updateTask: task: ", task) /*delete this*/
  task.important = task.important ? 1 : 0;
  task.private = task.private ? 1 : 0;

  return fetch(BASEURL + "/tasks/" + task.id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(task)
  }
  )
}

async function deleteTask(task) {
  console.log("deleteTask: ", task.id) /*delete this*/
  const response = await fetch(BASEURL + "/tasks/" + task.id, { method: 'DELETE' });
  if (!response.ok) {
    let err = { status: response.status, errObj: response.json };
    throw err;
  }
}

async function completeTask(task) {
  console.log("completeTask: ", task) /*delete this*/
  const response = await fetch(BASEURL + "/tasks/" + task.id, { method: 'POST' });
  if (!response.ok) {
    let err = { status: response.status, errObj: response.json };
    throw err;
  }
}

async function selectTask(task, userId) {

  console.log("select Task: " + task.id) /*delete this*/
  const response = await fetch(BASEURL + "/users/" + userId, {
    method: 'POST', headers: { 'Content-Type': 'application/json', },
    body: JSON.stringify({ taskId: task.id })
  });
  if (!response.ok) {
    console.log(response)
    let status = response.status;
    let err
    if (status === 409) err = { error: "That task has already been selected by another user" }
    else if (status === 500) err = { error: "Internal server error" }
    throw err;
  }
}

async function logIn(credentials) {
  console.log("login: " + credentials.email + credentials.password) /*delete this*/
  let response = await fetch('/api/users/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });
  if (response.ok) {
    const user = await response.json();
    console.log("login performed successfully: ", user)
    localStorage.setItem('activeTask', user.activeTask)
    return user;
  }
  else if (response.status >= 400 && response.status < 500) {
    throw new Error("Invalid Login Credentials")
  }
  else if (response.status >= 500) {
    throw new Error("Server is Unreachable")
  }
  else {
    throw new Error("An unexpected Error occurred")
  }
}

async function logOut() {
  console.log("logOut") /*delete this*/
  await fetch(BASEURL + '/users/session', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json', },
  });
}

async function getUserInfo() {
  try {
    const response = await fetch(BASEURL + "users/session");
    if (response.ok) {
      const user = await response.json();
      localStorage.setItem('activeTask', user.activeTask)
      return user;
    } else {
      return false
    }
  }
  catch (e) {
    return false
  }
}

async function getUsers() {
  console.log("getUsers, active user: ") /*delete this*/
  const response = await fetch(BASEURL + "users");
  const responseJson = await response.json();
  if (response.ok) {
    return responseJson.map((u) => {
      return new User(u.aid, u.name, u.email)
    });
  } else {
    let err = { status: response.status, errObj: responseJson };
    throw err; // An object with the error coming from the server
  }

}

async function assignTask(userId, taskId) {
  console.log("assignTask" + userId, taskId) /*delete this*/
  return new Promise((resolve, reject) => {
    fetch(BASEURL + "/tasks/" + taskId + "/assignees/" + userId, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }).then((response) => {
      if (response.ok) {
        resolve(null)
      } else {
        // analyze the cause of error
        response.json()
          .then((obj) => { reject(obj); }) // error msg in the response body
          .catch((err) => { reject({ errors: [{ param: "Application", msg: "Cannot parse server response" }] }) }); // something else
      }
    }).catch((err) => { reject({ errors: [{ param: "Server", msg: "Cannot communicate" }] }) }); // connection errors
  });
}

async function removeAssignTask(userId, taskId) {
  console.log("removeAssignTask: " + userId + ", " + taskId) /*delete this*/
  return new Promise((resolve, reject) => {

    fetch(BASEURL + "/tasks/" + taskId + "/assignees/" + userId, {
      method: 'DELETE'
    }).then((response) => {
      if (response.ok) {
        resolve(null)
      } else {
        // analyze the cause of error
        response.json()
          .then((obj) => { reject(obj); }) // error msg in the response body
          .catch((err) => { reject({ errors: [{ param: "Application", msg: "Cannot parse server response" }] }) }); // something else
      }
    }).catch((err) => { reject({ errors: [{ param: "Server", msg: "Cannot communicate" }] }) }); // connection errors
  });
}

const API = { addTask, getTasks, getPublicTasks, getAllOwnedTasks, updateTask, deleteTask, selectTask, logIn, logOut, getUserInfo, getUsers, assignTask, removeAssignTask, completeTask }
export default API;


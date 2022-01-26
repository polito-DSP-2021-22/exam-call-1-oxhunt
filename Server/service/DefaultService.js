'use strict';


/**
 * Retrieves the index containing the links to Important Resources
 *
 * returns index
 **/
exports.getIndex = function(isAuthenticated) {
  console.log("isAuthenticated:", isAuthenticated)
  return new Promise(function(resolve, reject) {
    var links = []
    if (!isAuthenticated) links.push({ href: "/api/users/session", rel: "login" })
    links.push({ href: "/api/tasks", rel: "tasks" })
    links.push({ href: "/api/users", rel: "users" })
    links.push({ href: "/api/", rel: "self" })
    resolve({ links: links });
  });
}


/**
 * used to submit the info required to login
 *
 * body LoginInfo  (optional)
 * no response value expected for this operation
 **/
exports.login = function(body) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


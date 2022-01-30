'use strict';

const baseUrl = "localhost:3001/api/"
/**
 * Retrieves the index containing the links to Important Resources
 *
 * returns index
 **/
exports.getIndex = function(isAuthenticated) {
  console.log("isAuthenticated:", isAuthenticated)
  return new Promise(function(resolve, reject) {
    var links = []
    if (!isAuthenticated) links.push({ href: baseUrl + "users/session", rel: "login" })
    links.push({ href: baseUrl + "tasks", rel: "tasks" })
    links.push({ href: baseUrl + "users", rel: "users" })
    links.push({ href: baseUrl + "", rel: "self" })
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


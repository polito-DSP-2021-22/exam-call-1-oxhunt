'use strict';

const bcrypt = require("bcrypt");
const db = require("./db");

//instead of admin => user
//instead of aid => id
//property name has been added

exports.getUserById = (uid) => {
    console.log("inside getUsers")//delete this
    // this query joins the set of tasks with owner =userid and the ones which are assigned to him
    const sql = "\
    SELECT id as uid, name, email, activeTask FROM users u WHERE id=?"
    return new Promise((resolve, reject) => {
        db.get(sql, [uid], (err, r) => {
            if (err) {
                console.log("an error occurred in getAllTasks in taskDao", err)//delete this
                reject(err, 500);
            }
            if (!r) {
                console.log("No user with such id:" + uid + " in the database")
                return reject("Not Found", 404)
            }

            const links = [{ self: "localhost:8080/api/users/" + uid }]
            const user = {
                name: r.name,
                email: r.email,
                aid: r.uid,
                activeTask: r.activeTask,
                links: links
            }

            resolve(user)
        });
    });
}

exports.getUser = (email, password) => {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM users WHERE email = ?";
        db.get(sql, [email], (err, row) => {
            if (err) reject(err);
            else if (row === undefined) {
                resolve(false);
            } else {
                const user = { id: row.id, email: row.email, name: row.name };

                // check the hashes with an async call, given that the operation may be CPU-intensive (and we don't want to block the server)
                bcrypt.compare(password, row.hash).then((result) => {
                    if (result) {
                        resolve(user);
                    }
                    else {
                        resolve(false);
                    }

                });
            }
        });
    });
};

exports.setActiveTask = function (uid, tid) {
    console.log("setting the active task")//delete this
    return new Promise((resolve, reject) => {
        const sql = "UPDATE users SET activeTask = ? WHERE id = ?";
        db.run(
            sql, [tid, uid], (err) => {
                if (err) {
                    console.log(err);
                    reject(err);
                } else resolve(null);
            }
        );
    });
};

exports.getUsers = () => {
    console.log("inside getUsers")//delete this
    // this query joins the set of tasks with owner =userid and the ones which are assigned to him
    const sql = "\
    SELECT id as uid, name, email, activeTask FROM users u"
    return new Promise((resolve, reject) => {
        db.all(sql, (err, rows) => {
            if (err) {
                console.log("an error occurred in getAllTasks in taskDao", err)//delete this
                reject(err);
            }
            
            const users = rows.map(row => {
                const links = [{ self: "localhost:8080/api/users/" + row.uid }]
                return {
                    name: row.name,
                    email: row.email,
                    aid: row.uid,
                    activeTask: row.activeTask,
                    links: links
                }
            })

            resolve(users)
        });
    });
}


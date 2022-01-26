'use strict';

const db = require("./db");
const sizePage = 10
const protocol = "../utils/protocol"

function getOwnerFromRow(row) { // ho rimosso il self da owner perchè non la considero una risorsa quindi non ha un uri
  return { name: row.name, aid: row.ownerId, email: row.email }
}


async function getTaskFromRow(row) {
  let images = null;
  images = await exports.getImagesLinksFromTaskId(row.taskId)

  const links = [
    { rel: "self", href: "localhost:8080/api/tasks/" + row.taskId },
    { rel: "assignedTo", href: "localhost:8080/api/tasks/" + row.taskId + "/assignees/" }
  ]
  const task = {
    important: row.important,
    owner: getOwnerFromRow(row),
    tid: row.taskId,
    description: row.description,
    private: row.private,
    project: row.project, // da modificare probabilmente
    deadline: row.deadline,
    completed: row.completed,
    links: links,
    images: images
  }
  return new Promise((resolve, reject) => resolve(task))
}
async function createPageItemsFromRows(rows) {
  
  let tasks = [];
  //console.log( await Promise.all(rows.map((row) => getTaskFromRow(row))))
  return await Promise.all(
    rows.map((row) => getTaskFromRow(row)))
}
const getTaskPageFromRows = async (rows, page, filter) => {
  if (!page) page = 1;
  const nItems = rows.length
  const rowStart = (page - 1) * sizePage
  const totalPages = Math.ceil(nItems * 1.0 / (1.0 * sizePage))
  const nextPage = page + 1;
  const prevPage = page - 1;
  const baseUrl = "/api/tasks?page="
  const f = (filter) ? "&filter=" + filter : ""
  let links = [
    { rel: "self", href: baseUrl + page + f }
  ];

  if (page < totalPages) links.push({ rel: "next", href: baseUrl + nextPage + f })
  if (page > 1) links.push({ rel: "prev", href: baseUrl + prevPage + f })
  return {
    totalItems: nItems,
    pageNumber: page,
    totalPages: totalPages,
    pageItems: await createPageItemsFromRows(rows.slice(rowStart, rowStart + sizePage)),
    links: links
  }
}
exports.isOwner = (uid, tid) => {
  const sql = "\
  SELECT owner FROM tasks t\
  WHERE t.id=? AND t.owner=?"
  return new Promise((resolve, reject) => {
    db.get(sql, [tid, uid], (err, row) => {
      if (err) {
        console.log("sqlite error:", err)//delete this
        return reject({ error: "err", code: 500 });
      }
      else if (!row) {
        return reject({ error: "Task Not Found", code: 404 });
      }
      resolve({ error: false, isOwner: true })
    })
  });
}
exports.isAssignee = (uid, tid) => {
  const sql = "\
  SELECT user FROM tasks t, assignments a WHERE t.id=? AND t.id=a.task AND a.user=?"
  return new Promise((resolve, reject) => {
    db.get(sql, [tid, uid], (err, row) => {
      if (err) {
        console.log("sqlite error:", err)//delete this
        return reject(false);
      }
      else if (!row) {
        return reject(false);
      }
      resolve(true)
    })
  });
}

exports.getAllTasksList = (userId, page) => {
  // this query joins the set of tasks with owner =userid and the ones which are assigned to him
  const sql = "\
  SELECT important, owner as ownerId, name, email, t.id as taskId, description, private, project, deadline, completed \
  FROM tasks t, assignments a, users u \
  WHERE t.owner=u.id AND (t.owner=? OR t.private=false OR a.user=?) AND (t.id=a.task ) \
  GROUP BY t.id \
  UNION \
  SELECT important, owner as ownerId, name, email, t.id as taskId, description, private, project, deadline, completed \
  FROM tasks t, users u \
  WHERE t.owner=u.id AND (t.owner=? OR t.private=false) \
  GROUP BY t.id"
  return new Promise((resolve, reject) => {
    db.all(sql, [userId, userId, userId], (err, rows) => {
      if (err) {
        console.log("an error occurred in getAllTasks in taskDao", err)//delete this
        reject(err);
      }
      else resolve(getTaskPageFromRows(rows, page));
    });
  });
}

exports.getOwnedTasksList = (userId, page) => {
  if (!page) page = 1;
  const rowStart = (page - 1) * sizePage
  // this query joins the set of tasks with owner =userid and the ones which are assigned to him
  const sql = "\
  SELECT important, owner as ownerId, name, email, t.id as taskId, description, private, project, deadline, completed \
  FROM tasks t, users u \
  WHERE t.owner=u.id AND (t.owner=?)"
  return new Promise((resolve, reject) => {
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        console.log("an error occurred in getOwnedTasks in taskDao", err)//delete this
        reject(err);
      }
      else resolve(getTaskPageFromRows(rows, page, "owned"));
    });
  });
}

exports.getAssignedTasksList = (userId, page) => {
  if (!page) page = 1;
  const rowStart = (page - 1) * sizePage
  // this query joins the set of tasks with owner =userid and the ones which are assigned to him
  const sql = "\
  SELECT important, owner as ownerId, name, email, t.id as taskId, description, private, project, deadline, completed \
  FROM tasks t, assignments a, users u \
  WHERE t.owner=u.id AND a.user=? AND (t.id=a.task ) \
  GROUP BY t.id"
  return new Promise((resolve, reject) => {
    db.all(sql, [userId], (err, rows) => {
      if (err) {
        console.log("an error occurred in getAllTasks in taskDao", err)//delete this
        reject(err);
      }
      else resolve(getTaskPageFromRows(rows, page, "assigned"));
    });
  });
}

exports.getPublicTasksList = (page) => {
  if (!page) page = 1;
  const rowStart = (page - 1) * sizePage
  // this query joins the set of tasks with owner =userid and the ones which are assigned to him
  const sql = "\
  SELECT important, owner as ownerId, name, email, t.id as taskId, description, private, project, deadline, completed \
  FROM tasks t, users u \
  WHERE t.owner=u.id AND t.private=false \
  GROUP BY t.id"
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) {
        console.log("an error occurred in getAllTasks in taskDao", err)//delete this
        reject(err);
      }
      else resolve(getTaskPageFromRows(rows, page, "public"));
    });
  });
}

exports.doesTaskExist = (tid) => {
  const sql = "SELECT  * FROM tasks t WHERE t.id=?"
  return new Promise((resolve, reject) => {
    db.get(sql, [tid], (err, row) => {
      if (err) {
        console.log("sqlite error:", err)//delete this
        reject();
      }
      else if (!row) {
        reject();
      }
      else {
        //console.log("task found: ", getTaskFromRow(row))//delete this
        resolve();
      }
    })
  });
}

exports.getTaskById = (id, userId) => {
  const sql = "\
  SELECT important, owner as ownerId, name, email, t.id as taskId, description, private, project, deadline, completed \
  FROM tasks t, assignments a, users u \
  WHERE t.owner=u.id AND t.id=? AND (t.owner=? OR t.private=false OR a.user=?) AND (t.id=a.task ) \
  GROUP BY t.id \
  UNION \
  SELECT important, owner as ownerId, name, email, t.id as taskId, description, private, project, deadline, completed \
  FROM tasks t, users u \
  WHERE t.owner=u.id AND t.id=? AND (t.owner=? OR t.private=false) \
  GROUP BY t.id"
  return new Promise((resolve, reject) => {
    db.get(sql, [id, userId, userId, id, userId], (err, row) => {
      if (err) {
        console.log("sqlite error:", err)//delete this
        reject(err);
      }
      else if (!row) {
        console.log("get task by id")//delete this
        resolve(null);
      }
      else {
        //console.log("task found: ", getTaskFromRow(row))//delete this
        resolve(getTaskFromRow(row));
      }
    })
  });
}
exports.getImagesLinksFromTaskId = async (tid) => {
  try {
    const sql = "SELECT id as iid, name FROM images i WHERE i.task=?"
    return await new Promise((resolve, reject) => {
      db.all(sql, [tid], (err, rows) => {
        if (err) {
          console.log("an error occurred in getTaskFromRow in taskDao", err)//delete this
          reject(err);
        }
        if (!rows.length) resolve(null)
        const images = [rows.map(row => {
          if (row) return { name: row.name, href: "localhost:8080/api/tasks/" + tid + "/images/" + row.iid, rel: "image" }
          else return null
        })]
        resolve(images)
      });
    });
  }
  catch (e) {
    console.log("an error occurred", e)
  }

}
exports.getImageById = (tid, iid) => {
  const sql = "\
  SELECT * \
  FROM images i \
  WHERE i.id =? AND i.task=?"
  return new Promise((resolve, reject) => {
    db.get(sql, [iid, tid], (err, row) => {
      if (err) {
        console.log("sqlite error:", err)//delete this
        reject(err);
      }
      else if (!row) {
        console.log("No image found")
        resolve(null);
      }
      else {
        resolve(row);
      }
    })
  });
}


exports.createTask = function (task, uid) {
  /*
  if(task.important===undefined)task.important=false;
  if(!task.private === undefined)task.private=true;
  if(deadline === undefined)task.deadline=null;
  */
  return new Promise((resolve, reject) => {
    const sql = "INSERT INTO tasks(description, important, private, deadline, project, owner)\
    SELECT ?, ?, ?, ?, ?, ? \
    WHERE NOT EXISTS(SELECT 1 FROM tasks WHERE description=? AND important=? AND private=? AND deadline=? AND completed=false AND project=? AND owner=?);"
    //const sql1 = "INSERT INTO tasks(description, important, private, deadline, completed, project, owner) VALUES(?,?,?,?,?,?,?)";
    db.run(sql,
      [
        task.description,
        task.important,
        task.private,
        task.deadline,
        task.project,
        uid,
        task.description,
        task.important,
        task.private,
        task.deadline,
        task.project,
        uid,
      ],
      function (err) {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          console.log(this.lastID);
          resolve(this.lastID);
        }
      }
    );
  });
};

exports.completeTask = function (uid, tid) {
  console.log("completing the task")//delete this
  return new Promise((resolve, reject) => {
    const sql = "UPDATE tasks SET completed = true WHERE id = ?";
    db.run(
      sql, [tid], (err) => {
        if (err) {
          console.log(err);
          reject(err);
        } else resolve(null);
      }
    );
  });
};

exports.updateTask = function (tid, newTask, userId) {
  console.log("updating Task: tid:", tid, ", userId:", userId)
  return new Promise((resolve, reject) => {
    const sql = "UPDATE tasks SET description = ?, important = ?, private = ?, deadline = ?, project=? WHERE id = ? AND owner=?";
    db.run(
      sql,
      [
        newTask.description,
        newTask.important,
        newTask.private,
        newTask.deadline,
        newTask.projects,
        tid,
        userId,
      ],
      (err) => {
        if (err) {
          console.log(err);
          reject(err);
        } else resolve(null);
      }
    );
  });
};


exports.deleteTask = function (id, userId) {
  return new Promise((resolve, reject) => {
    const sql = "DELETE FROM tasks WHERE id=? AND owner=?"; // the owner can only delete its tasks
    db.run(sql, [id, userId], (err) => {
      if (err) {
        console.log("error occurred: ", err)//delete this
        reject(err);
      }
      else {
        console.log("task deleted, provided that privilege was enough")
        resolve(null);
      }
    });
  });
};

exports.deleteImageFromTask = function (tid, iid) {
  return new Promise((resolve, reject) => {
    const sql = "DELETE FROM images WHERE task=? AND id=?"; // the owner can only delete its tasks
    db.run(sql, [tid, iid], (err) => {
      if (err) {
        console.log("error occurred: ", err)//delete this
        reject(err);
      }
      else {
        console.log("image deleted, provided that privilege was enough")
        resolve(null);
      }
    });
  });
};




/**
 * Assignees related Functions
 */

exports.getAssignees = (userId, tid) => {
  console.log("inside getlistassignees")//delete this
  // this query joins the set of tasks with owner =userid and the ones which are assigned to him
  const sql = "\
  SELECT user as aid, name, email\
  FROM tasks t, assignments a, users u\
  WHERE a.user=u.id AND t.owner=? AND (t.id=a.task ) AND t.id=?"
  return new Promise((resolve, reject) => {
    db.all(sql, [userId, tid], (err, rows) => {
      if (err) {
        console.log("an error occurred in getAllTasks in taskDao", err)//delete this
        reject(err);
      }
      console.log(rows)//delete this
      const assignees = [rows.map(row => {
        const links = [{ 
          self: "localhost:8080/api/tasks/" + tid + "/assignees/" + row.aid,
          relatedUser: "localhost:8080/api/users/" + row.aid
        }]
        return {
          name: row.name,
          email: row.email,
          aid: row.aid,
          links: links
        }
      })]

      resolve(assignees)
    });
  });
}

exports.removeAssigneeFromTask = function (aid, tid) {
  console.log("removing assignee from task, tid: ", tid, ", aid: ", aid)//delete this
  return new Promise((resolve, reject) => {
    const sql = "DELETE FROM assignments WHERE task=? AND user=?"; // the owner can only delete its tasks
    db.run(sql, [tid, aid], (err) => {
      if (err) {
        console.log("error occurred: ", err)//delete this
        reject(err);
      }
      else {
        console.log("Assignment deleted, provided that privilege was enough")
        resolve(null);
      }
    });
  });
};

exports.addAssigneeToTask = function (aid, tid) {
  console.log("adding assignee ", aid, ", to task ", tid)//delete this
  return new Promise((resolve, reject) => {
    const sql = "INSERT INTO assignments (task, user)\
    SELECT ?, ? \
    WHERE NOT EXISTS(SELECT 1 FROM assignments WHERE task=? AND user=?);"
    db.run(sql, [tid, aid, tid, aid],
      function (err) {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          console.log(this.lastID);
          resolve(this.lastID);
        }
      }
    );
  });
};

exports.addImageToTask = function (tid, img) {
  console.log("tid: ", tid)
  return new Promise((resolve, reject) => {
    const sql = "INSERT INTO images (image,task, mimetype, encoding, name) SELECT ?,?,?,?,?\
    WHERE NOT EXISTS(SELECT 1 FROM images WHERE task=? AND mimetype=? AND encoding=? AND name=?);"
    db.run(sql, [img.buffer, tid, img.mimetype, img.encoding, img.originalname, tid, img.mimetype, img.encoding, img.originalname],
      function (err) {
        if (err) {
          console.log(err);
          reject(err);
        } else {
          console.log(this.lastID);
          resolve(this.lastID);
        }
      }
    );
  });
};
exports.autoAssignTasks = function (user, counter) {
  if (!counter) counter = 0;
  // we start by getting the list of unassigned tids
  const sql = "SELECT t.id as id\
  FROM tasks t\
  WHERE owner=1 AND t.id NOT IN (SELECT task FROM assignments)"
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) {
        console.log("an error occurred in getAllTasks in taskDao", err)//delete this
        reject(err);
      }
      const tids = rows.map(r => r.id)

      let repeat
      // if we didn't find any, we end the execution
      console.log("found unassigned tids: ", (tids) ? tids : "Not Found")//delete this
      if (!tids.length) return resolve();

      // we get the list of  users and their respective amount of tasks assigned
      const sql = "SELECT user as assignee, count(*) as counting\
      FROM assignments a, tasks t\
      WHERE t.owner=? AND a.task = t.id\
      GROUP BY user\
      UNION\
      SELECT id, 0 FROM users u WHERE id NOT IN (SELECT user FROM assignments GROUP BY user)"
      db.all(sql, [user], (err, rows) => {
        if (err) {
          console.log("an error occurred in getAllTasks in taskDao", err)//delete this
          reject(err);
        }
        // we order the list of users according to the number of assigned tasks, increasing order
        // and we assign the task, but 
        console.log("users assignments distribution: ", rows)
        for (let tid in tids) {
          const min = rows.sort((r1, r2) => r1.counting - r2.counting);
          exports.addAssigneeToTask(min[counter].assignee, tids[tid])
            .catch((e) => reject(e))
          min[counter].counting = min[counter].counting + 1 // we update the count of assigned tids for the given assignee
        }

        if (repeat) resolve(exports.getUnassignedTasks(user, counter + 1))
        else return resolve();
      });
    });
  });
}


exports.getAllAssignments = ()=>{
  console.log("inside getAllAssignments")//delete this

  const sql = "\
  SELECT a.user as aid, a.task as tid\
  FROM assignments a"
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.log("an error occurred in getAllAssignments in taskDao", err)//delete this
        reject(err);
      }

      resolve(rows)
    });
  });
}

exports.getAllExistingTasks = () =>{
  console.log("inside getAllExistingTasks")//delete this

  const sql = "\
  SELECT important, owner as ownerId, t.id as tid, description, private, project, deadline, completed\
  FROM tasks t"
  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        console.log("an error occurred in getAllAssignments in taskDao", err)//delete this
        reject(err);
      }

      resolve(rows)
    });
  });
}

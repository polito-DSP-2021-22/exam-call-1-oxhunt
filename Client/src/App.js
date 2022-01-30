import { React, useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, useLocation } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import API from './API'

import { Container, Row, Col, Button, Toast } from 'react-bootstrap/';


import Navigation from './components/Navigation';
import Filters from './components/Filters';
import ContentList from './components/ContentList';
import PublicList from './components/PublicList';
import ModalForm from './components/ModalForm';
import { LoginForm } from './components/Login';
import Assignments from './components/Assignments';
import OnlineList from './components/OnlineList';
import MiniOnlineList from './components/MiniOnlineList';

import { Route, useRouteMatch, useHistory, Switch, Redirect } from 'react-router-dom';
import websocketSetup from './utils/websocket'
import MQTTSetup from './utils/mqtt' //mqtt client
import { differentialSubscribe, subscribeToAll } from './utils/mqtt';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
dayjs.extend(isToday);


const App = () => {

  // Need to place <Router> above the components that use router hooks
  return (
    <Router>
      <Main></Main>
    </Router>
  );

}

const setActiveTask = (tasks) => {
  let activeTask = parseInt(localStorage.getItem('activeTask'))
  return tasks.map(e => {
    if (e.id === activeTask) e.active = 1;
    else e.active = 0;
    return e;
  })
}
let done = false;

const Main = () => {
  var activeTask = -1;
  const location = useLocation();
  // This state is an object containing the list of tasks, and the last used ID (necessary to create a new task that has a unique ID)
  const [taskList, setTaskList] = useState([]);
  const [OwnedTaskList, setOwnedTaskList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [onlineList, setOnlineList] = useState([]);
  const [dirty, setDirty] = useState(true);
  const MODAL = { CLOSED: -2, ADD: -1 };
  const [selectedTask, setSelectedTask] = useState(MODAL.CLOSED);
  const [assignedTaskList, setAssignedTaskList] = useState([]);
  const taskListRef = useRef();
  taskListRef.current = taskList;
  const [message, setMessage] = useState('');

  const [loggedIn, setLoggedIn] = useState(false); // at the beginning, no user is logged in
  const [user, setUser] = useState(null);

  // active filter is read from the current url
  const match = useRouteMatch('/list/:filter');
  const activeFilter = (match && match.params && match.params.filter) ? match.params.filter : 'owned';

  const history = useHistory();

  // useEffect that handles the public tasks
  useEffect(() => {
    if (!dirty) return;
    if (location.pathname === "/public") {
      console.log("public")
      API.getPublicTasks(localStorage.getItem('currentPage'))
        .then(tasks => {
          differentialSubscribe([], "tasks/selection/")
          console.log("useEffect: getting public tasks")
          setTaskList(setActiveTask(tasks));
          setDirty(false)
        })
        .catch(e => handleErrors(e));
    }
  }, [location, dirty]);

  // useEffect that triggers a reload each time the uri changes
  useEffect(() => {

    if (location.pathname === "/public") subscribeToAll(true, "tasks/public/")
    else subscribeToAll(false, "tasks/public/")
    localStorage.setItem("currentPage", 1)
    setDirty(true)
  }, [location.pathname]);

  // useEffect that handles the reload for the owned and assigned tasks
  useEffect(() => {
    if (!loggedIn || !dirty) return;
    if (location.pathname === "/list/owned") {
      console.log("owned")
      API.getTasks('owned', localStorage.getItem('currentPage'))
        .then(tasks => {
          console.log("useEffect: getting owned tasks")
          differentialSubscribe(tasks, "tasks/selection/")
          setTaskList(setActiveTask(tasks));
          setDirty(false)
        })
        .catch(e => handleErrors(e));
    }
    else if (location.pathname === "/list/assigned") {
      console.log("assigned")
      API.getTasks('assigned', localStorage.getItem('currentPage'))
        .then(tasks => {
          console.log("useEffect: getting assigned tasks")
          differentialSubscribe(tasks, "tasks/selection/")
          setTaskList(setActiveTask(tasks));
          setDirty(false)
        })
        .catch(e => handleErrors(e));
    }
  }, [location, loggedIn, dirty]);

  // useEffect that handles the reload for the assignment page
  useEffect(() => {
    if (location.pathname === "/assignment") {
      API.getAllOwnedTasks()
        .then(tasks => {
          setOwnedTaskList(tasks.map(e => {
            if (e.id === activeTask) e.active = 1;
            else e.active = 0;
            return e
          }));
        })
        .catch(e => handleErrors(e));
      API.getUsers()
        .then(users => {
          console.log(users)
          setUserList(users);
        })
        .catch(e => handleErrors(e));
    }
  }, [location, activeTask]);


  useEffect(() => {
    // check if user is authenticated
    const checkAuth = async () => {
      try {
        // here you have the user info, if already logged in
        const user = await API.getUserInfo();
        setUser(user);
        if (user) {
          setLoggedIn(true);
        } else {
          console.log('error');
        }

      } catch (err) {
        console.log(err.error); // mostly unauthenticated user
      }
    };
    websocketSetup(setOnlineList, handleErrors);
    checkAuth();

  }, []);

  useEffect(() => {
    const updatePublicTasksInfo = (topic, parsedMessage) => {

      const taskId = topic.split("/")[2];

      let tlist = taskListRef.current;
      if (!tlist.length) return;

      if (parsedMessage.operation === "deletion") {
        const lengthBefore = tlist.length
        tlist = tlist.filter(t => t.id !== parseInt(taskId))

        const maxSizePage = localStorage.getItem("maxSizePage")
        const currentPage = localStorage.getItem("currentPage")
        const totalPages = localStorage.getItem("totalPages")
        const totalItems = parseInt(localStorage.getItem("totalItems")) + (tlist.length - lengthBefore)

        console.log(totalItems, maxSizePage * (totalPages - 1))
        if (totalItems <= maxSizePage * (totalPages - 1)) {
          console.log("inside reload: ", currentPage, totalPages)
          if (currentPage >= totalPages) localStorage.setItem("currentPage", (currentPage - 1) ? currentPage - 1 : currentPage)
          setDirty(true)
          return
        }
        localStorage.setItem("totalItems", totalItems)
        setTaskList(tlist)
      }
      else if (parsedMessage.operation === "update") {
        parsedMessage.deadline = parsedMessage.deadline && dayjs(parsedMessage.deadline)
        tlist = tlist.filter(t => t.id !== parseInt(taskId));
        tlist.push(parsedMessage)
        setTaskList(tlist)
      }
      else if (parsedMessage.operation === "creation") {
        console.log(parsedMessage)///
        const lengthBefore = tlist.length
        tlist = tlist.filter(t => t.id !== parseInt(taskId));
        parsedMessage.deadline = parsedMessage.deadline && dayjs(parsedMessage.deadline)

        const maxSizePage = localStorage.getItem("maxSizePage")
        const currentPage = localStorage.getItem("currentPage")
        const totalPages = localStorage.getItem("totalPages")

        const totalItems = parseInt(localStorage.getItem("totalItems")) + 1 + tlist.length - lengthBefore

        if (totalItems > maxSizePage * totalPages) {
          console.log("dirty because:", totalItems, maxSizePage * totalPages)
          setDirty(true)
          return
        }
        localStorage.setItem("totalItems", totalItems)
        // only add the task if on the last page and 
        //if (tlist.length >= maxSizePage) return

        if (currentPage !== totalPages) return
        tlist.push(parsedMessage)
        console.log(tlist)
        setTaskList(tlist)
      }
    }
    const displayTaskSelection = (topic, parsedMessage) => {
      const taskId = parseInt(topic.split("/")[2]);
      var index = assignedTaskList.findIndex(x => x.taskId === taskId);
      let objectStatus = { taskId: taskId, userName: parsedMessage.userName, status: parsedMessage.status };
      index === -1 ? assignedTaskList.push(objectStatus) : assignedTaskList[index] = objectStatus;
      setAssignedTaskList(assignedTaskList.map(a => a))
    }
    if (done !== true) {
      MQTTSetup(displayTaskSelection, updatePublicTasksInfo);
      done = true
    }
  }, [assignedTaskList]);


  const deleteTask = (task) => {
    API.deleteTask(task)
      .then(() => {
        // if last task of the page, 
        if (taskList.length - 1 === 0) {
          const currentPage = localStorage.getItem("currentPage")
          localStorage.setItem("currentPage", (currentPage - 1)?currentPage-1:currentPage)
        }
        setDirty(true)        
      })
      .catch(e => handleErrors(e))
  }

  const completeTask = (task) => {
    API.completeTask(task)
      .then(() => { setDirty(true) })
      .catch(e => handleErrors(e))
  }


  const findTask = (id) => {
    return taskList.find(t => t.id === id);
  }



  const selectTask = (task) => {
    API.selectTask(task, user.id)
      .then(() => API.getUserInfo()).then(() => setTaskList(setActiveTask(taskList)))
      .catch(e => handleErrors(e))
  }

  // show error message in toast
  const handleErrors = (err) => {
    setMessage({ msg: err.error, type: 'danger' });
    console.log(err.error);
  }


  // add or update a task into the list
  const handleSaveOrUpdate = (task) => {

    // if the task has an id it is an update
    if (task.id) {
      API.updateTask(task)
        .then(response => {
          if (response.ok) {
            API.getTasks(activeFilter, localStorage.getItem('currentPage'))
              .then(tasks => {
                setTaskList(setActiveTask(tasks));
              }).catch(e => handleErrors(e));
          }
        }).catch(e => handleErrors(e));

      // otherwise it is a new task to add
    } else {
      API.addTask(task)
        .then(() => setDirty(true))
        .catch(e => handleErrors(e));
    }
    setSelectedTask(MODAL.CLOSED);
  }

  const handleEdit = (task) => {
    setSelectedTask(task.id);
  }

  const handleClose = () => {
    setSelectedTask(MODAL.CLOSED);
  }



  const handleLogOut = async () => {

    await API.logOut()
    // clean up everything
    setLoggedIn(false);
    setUser(null);
    subscribeToAll(false, "tasks/public/")
    differentialSubscribe([], "tasks/selection/");
    setTaskList([]);
    setDirty(true);
    localStorage.removeItem('activeTask');
  }


  return (

    <Container fluid>
      <Row>
        <Navigation onLogOut={handleLogOut} loggedIn={loggedIn} user={user} />
      </Row>

      <Toast show={message !== ''} onClose={() => setMessage('')} delay={3000} autohide>
        <Toast.Body>{message?.msg}</Toast.Body>
      </Toast>

      <Switch>
        <Route path="/login">
          <Row className="vh-100 below-nav">
            {loggedIn ? <Redirect to="/" /> : <LoginForm setUser={setUser} setLoggedIn={setLoggedIn} API={API} />}
          </Row>
        </Route>


        <Route path="/public">
          <Row className="vheight-100">
            <Col sm={3} bg="light" className="d-block col-4" id="left-sidebar">
              <span>&nbsp;&nbsp;</span>
              <MiniOnlineList onlineList={onlineList} />
            </Col>
            <Col className="col-8">
              <Row className="vh-100 below-nav">
                <PublicMgr publicList={taskList} setDirty={setDirty}></PublicMgr>
              </Row>
            </Col>
          </Row>
        </Route>

        <Route path="/online">
          <Row className="vheight-100">
            <Col sm={3} bg="light" className="d-block col-4" id="left-sidebar">
              <span>&nbsp;&nbsp;</span>
              <MiniOnlineList onlineList={onlineList} />
            </Col>
            <Col sm={8} className="below-nav">
              <h5><strong>Online Users</strong></h5>
              <div className="user">
                <OnlineList usersList={onlineList} />
              </div>
            </Col>
          </Row>
        </Route>

        <Route path="/assignment">
          {loggedIn ?
            <Row className="vheight-100">
              <Col sm={3} bg="light" className="d-block col-4" id="left-sidebar">
                <span>&nbsp;&nbsp;</span>
                <MiniOnlineList onlineList={onlineList} />
              </Col>
              <Col sm={8} bg="light" id="left-sidebar" className="collapse d-sm-block below-nav">
                <Assignments OwnedTaskList={OwnedTaskList} UserList={userList} handleErrors={handleErrors} />
              </Col>
            </Row>
            : <Redirect to="/login" />
          } </Route>

        <Route path={["/list/:filter"]}>
          {loggedIn ?
            <Row className="vh-100 below-nav">
              <TaskMgr taskList={taskList} filter={activeFilter}
                onDelete={deleteTask} onEdit={handleEdit} onComplete={completeTask}
                onCheck={selectTask} history={history}
                refresh={setDirty} onlineList={onlineList} assignedTaskList={assignedTaskList}></TaskMgr>
              <Button variant="success" size="lg" className="fixed-right-bottom" onClick={() => setSelectedTask(MODAL.ADD)}>+</Button>
              {(selectedTask !== MODAL.CLOSED) && <ModalForm task={findTask(selectedTask)} onSave={handleSaveOrUpdate} onClose={handleClose}></ModalForm>}
            </Row> : <Redirect to="/login" />
          }
        </Route>
        <Route>
          <Redirect to="/list/owned" />
        </Route>
      </Switch>
    </Container>

  );

}


const TaskMgr = (props) => {

  const { taskList, filter, onDelete, onEdit, onComplete, onCheck, history, refresh, onlineList, assignedTaskList } = props;


  // ** FILTER DEFINITIONS **
  const filters = {
    'owned': { label: 'Owned Tasks', id: 'owned' },
    'assigned': { label: 'Assigned Tasks', id: 'assigned' }
  };

  // if filter is not known apply "all"
  const activeFilter = (filter && filter in filters) ? filter : 'owned';

  return (
    <>
      <Col sm={3} bg="light" className="d-block col-4" id="left-sidebar">
        <Filters items={filters} defaultActiveKey={activeFilter} history={history} />
        <MiniOnlineList onlineList={onlineList} />
      </Col>
      <Col className="col-8">
        <h1 className="pb-3">Filter: <small className="text-muted">{activeFilter}</small></h1>
        <ContentList
          tasks={taskList}
          onDelete={onDelete} onEdit={onEdit} onCheck={onCheck} onComplete={onComplete}
          filter={activeFilter} refresh={refresh} assignedTaskList={assignedTaskList}
        />
      </Col>
    </>
  )

}


const PublicMgr = (props) => {

  const { publicList, setDirty } = props;


  return (
    <>
      <Col className="col-8">
        <h1 className="pb-3">Public Tasks</h1>
        <PublicList
          tasks={publicList} refresh={setDirty}
        />
      </Col>
    </>
  )

}


export default App;

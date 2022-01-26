import { React, useState, useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';

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
import client from './utils/mqtt' //mqtt client

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


const Main = () => {
  var activeTask = -1;
  // This state is an object containing the list of tasks, and the last used ID (necessary to create a new task that has a unique ID)
  const [taskList, setTaskList] = useState([]);
  const [OwnedTaskList, setOwnedTaskList] = useState([]);
  const [userList, setUserList] = useState([]);
  const [onlineList, setOnlineList] = useState([]);
  const [dirty, setDirty] = useState(true);
  const MODAL = { CLOSED: -2, ADD: -1 };
  const [selectedTask, setSelectedTask] = useState(MODAL.CLOSED);
  const [assignedTaskList, setAssignedTaskList] = useState([]);

  const [message, setMessage] = useState('');

  const [loggedIn, setLoggedIn] = useState(false); // at the beginning, no user is logged in
  const [user, setUser] = useState(null);

  // active filter is read from the current url
  const match = useRouteMatch('/list/:filter');
  const activeFilter = (match && match.params && match.params.filter) ? match.params.filter : 'owned';

  const history = useHistory();
  // if another filter is selected, redirect to a new view/url
  const handleSelectFilter = (filter) => {
    history.push("/list/" + filter);
  }

  const subscribeToAll = (tasks)=>{
    for (var i = 0; i < tasks.length; i++) {
      client.subscribe(String(tasks[i].id), { qos: 0, retain: true }, (err, granted)=>{
        if(err)console.log("error:", err, ", granted: ", granted)
      });
      console.log("Subscribing to " + tasks[i].id)
    }                                                                                                                    
  }

  useEffect(() => {
    const displayTaskSelection = (topic, parsedMessage) => {

      var index = assignedTaskList.findIndex(x => x.taskId === topic);
      let objectStatus = { taskId: topic, userName: parsedMessage.userName, status: parsedMessage.status };
      index === -1 ? assignedTaskList.push(objectStatus) : assignedTaskList[index] = objectStatus;
  
      setDirty(true);
    }
    //MQTT setup
    client.on('message', (topic, message) => {
      try {
        var parsedMessage = JSON.parse(message);
        if (parsedMessage.status === "deleted") client.unsubscribe(topic);
        console.log("MQTT received message: ", parsedMessage, ", in topic: ", topic)
        displayTaskSelection(topic, parsedMessage);
      } catch (e) {
        console.log(e);
      }
    })
    // --------------------end mqtt part
    // -----------------------------------------------------------

    websocketSetup(setOnlineList, handleErrors);

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
    checkAuth();
  }, []);


  // set dirty to true only if acfiveFilter changes, if the active filter is not changed dirty = false avoids triggering a new fetch
  useEffect(() => {
    setDirty(true);
  }, [activeFilter])

  const deleteTask = (task) => {
    API.deleteTask(task)
      .then(() => setDirty(true))
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

  const getInitialTasks = () => {
    if (loggedIn) {
      API.getTasks(null, null)
        .then(tasks => {
          subscribeToAll(tasks)
          setTaskList(setActiveTask(tasks));
        })
        .catch(e => handleErrors(e));
    }
  }

  const getPublicTasks = () => {
    API.getPublicTasks()
      .then(tasks => {
        setTaskList(setActiveTask(tasks));
      })
      .catch(e => handleErrors(e));
  }

  const getAllOwnedTasks = () => {
    API.getAllOwnedTasks()
      .then(tasks => {
        setOwnedTaskList(tasks.map(e => {
          if (e.id === activeTask) e.active = 1;
          else e.active = 0;
          return e
        }));
      })
      .catch(e => handleErrors(e));
  }

  const getUsers = () => {
    API.getUsers()
      .then(users => {
        //setTaskList(setActiveTask(taskList))
        console.log(users)
        setUserList(users);
      })
      .catch(e => handleErrors(e));
  }

  const refreshTasks = (filter, page) => {
    API.getTasks(filter, page)
      .then(tasks => {
        subscribeToAll(tasks)
        setTaskList(setActiveTask(tasks));
        setDirty(false);
      })
      .catch(e => handleErrors(e));
  }

  const refreshPublic = (page) => {
    API.getPublicTasks(page)
      .then(tasks => {
        setTaskList(setActiveTask(tasks));
        setDirty(false);
      })
      .catch(e => handleErrors(e));
  }

  const assignTask = (userId, tasksId) => {
    for (var i = 0; i < tasksId.length; i++) {
      API.assignTask(Number(userId), tasksId[i]).catch(e => handleErrors(e));;
    }
  }

  const removeAssignTask = (userId, tasksId) => {
    for (var i = 0; i < tasksId.length; i++) {
      API.removeAssignTask(Number(userId), tasksId[i]).catch(e => handleErrors(e));;
    }
  }

  const selectTask = (task) => {
    API.selectTask(task, user.id)
      .then(() => API.getUserInfo()).then(() => setTaskList(setActiveTask(taskList)))
      .catch(e => handleErrors(e))
  }


  useEffect(() => {
    if (loggedIn && dirty) {
      API.getTasks(activeFilter, localStorage.getItem('currentPage'))
        .then(tasks => {
          subscribeToAll(tasks)
          setTaskList(setActiveTask(tasks));
          setDirty(false);
        })
        .catch(e => handleErrors(e));
    }
  }, [activeFilter, dirty, loggedIn, user])

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

  const doLogIn = async (credentials) => {
    try {
      const user = await API.logIn(credentials);

      setUser(user);
      setLoggedIn(true);
    }
    catch (err) {
      // error is handled and visualized in the login form, do not manage error, throw it
      throw err;
    }
  }

  const handleLogOut = async () => {

    await API.logOut()
    // clean up everything
    setLoggedIn(false);
    setUser(null);
    setTaskList([]);
    setDirty(true);
    localStorage.removeItem('activeTask');
  }


  return (

    <Container fluid>
      <Row>
        <Navigation onLogOut={handleLogOut} loggedIn={loggedIn} user={user} getPublicTasks={getPublicTasks} getInitialTasks={getInitialTasks} />
      </Row>

      <Toast show={message !== ''} onClose={() => setMessage('')} delay={3000} autohide>
        <Toast.Body>{message?.msg}</Toast.Body>
      </Toast>

      <Switch>
        <Route path="/login">
          <Row className="vh-100 below-nav">
            {loggedIn ? <Redirect to="/" /> : <LoginForm login={doLogIn} />}
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
                <PublicMgr publicList={taskList} refreshPublic={refreshPublic}></PublicMgr>
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
                <Assignments OwnedTaskList={OwnedTaskList} getAllOwnedTasks={getAllOwnedTasks} UserList={userList} getUsers={getUsers} assignTask={assignTask} removeAssignTask={removeAssignTask} />
              </Col>
            </Row>
            : <Redirect to="/login" />
          } </Route>

        <Route path={["/list/:filter"]}>
          {loggedIn ?
            <Row className="vh-100 below-nav">
              <TaskMgr taskList={taskList} filter={activeFilter}
                onDelete={deleteTask} onEdit={handleEdit} onComplete={completeTask}
                onCheck={selectTask} onSelect={handleSelectFilter}
                refreshTasks={refreshTasks} onlineList={onlineList} assignedTaskList={assignedTaskList}></TaskMgr>
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

  const { taskList, filter, onDelete, onEdit, onComplete, onCheck, onSelect, refreshTasks, onlineList, assignedTaskList } = props;


  // ** FILTER DEFINITIONS **
  const filters = {
    'owned': { label: 'Owned Tasks', id: 'owned' },
    'assigned': { label: 'Assigned Tasks', id: 'assigned' }
  };

  // if filter is not know apply "all"
  const activeFilter = (filter && filter in filters) ? filter : 'owned';

  return (
    <>
      <Col sm={3} bg="light" className="d-block col-4" id="left-sidebar">
        <Filters items={filters} defaultActiveKey={activeFilter} onSelect={onSelect} />
        <MiniOnlineList onlineList={onlineList} />
      </Col>
      <Col className="col-8">
        <h1 className="pb-3">Filter: <small className="text-muted">{activeFilter}</small></h1>
        <ContentList
          tasks={taskList}
          onDelete={onDelete} onEdit={onEdit} onCheck={onCheck} onComplete={onComplete}
          filter={activeFilter} getTasks={refreshTasks} assignedTaskList={assignedTaskList}
        />
      </Col>
    </>
  )

}


const PublicMgr = (props) => {

  const { publicList, refreshPublic } = props;


  return (
    <>
      <Col className="col-8">
        <h1 className="pb-3">Public Tasks</h1>
        <PublicList
          tasks={publicList} getTasks={refreshPublic}
        />
      </Col>
    </>
  )

}


export default App;

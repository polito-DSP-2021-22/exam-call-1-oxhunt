import React from 'react';
import ListGroup from 'react-bootstrap/ListGroup';

const MiniOnlineList = (props) => {
    const {onlineList} = props;

    const createUserItem = (user, index) => {
        return (
            <ListGroup.Item key={index} ><img src={require("../world.png").default} alt={"Eagle"} width="20" height="20"  />{ " User: "+user.userName}</ListGroup.Item>
        );
    }
        
    
    return (
        <>
           <ListGroup  variant="flush">
                <ListGroup.Item className="p-3 mt-5 list-title">Online Users</ListGroup.Item>
                {onlineList.map((user, index) => createUserItem(user, index)) }
            </ListGroup>
        </>
    );
}



export default MiniOnlineList;

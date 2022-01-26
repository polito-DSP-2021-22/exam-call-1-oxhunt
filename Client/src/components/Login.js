import { Form, Button, Alert, Modal } from 'react-bootstrap';
import { useState } from 'react';

function LoginForm(props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    setErrorMessage('');
    const credentials = { email, password };

    // basic validation
    let valid = true;
    if (!email || !password || password.length < 6) {
      valid = false;
      setErrorMessage('Email cannot be empty and password must be at least six character long.');
      setShow(true);
    }

    if(valid)
    {
      props.login(credentials)
        .catch( (e) => { setErrorMessage(e.message); setShow(true); } )
    }


  };


  return (
    <Modal centered show animation={false}>
      <Form onSubmit={handleSubmit}>
        <Modal.Header>
          <Modal.Title>Login</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert
            dismissible
            show={show}
            onClose={() => setShow(false)}
            variant="danger">
            {errorMessage}
          </Alert>
          <Form.Group controlId="email">
            <Form.Label>email</Form.Label>
            <Form.Control
              type="email"
              onChange={(ev) => setEmail(ev.target.value)}
              placeholder="name@example.com"
            />
          </Form.Group>
          <Form.Group controlId="password">
            <Form.Label>Password</Form.Label>
            <Form.Control
              placeholder="password"
              type="password"
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button type="submit">Login</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

function LogoutButton(props) {
  return (
      <Button variant="outline-light" onClick={props.logout}>Logout</Button>
  )
}

export { LoginForm, LogoutButton };



import React, { useState } from 'react';
import { Form, Input, Button, Typography } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import './loginPage.css';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebase';
import { getDocs, collectionGroup } from 'firebase/firestore';
import { setPersistence, browserLocalPersistence } from "firebase/auth";


setPersistence(auth, browserLocalPersistence)
  .catch((error) => {
    console.error("Error setting persistence:", error);
  });

const { Title } = Typography;

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate(); 

  const handleLogin = async (values) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      console.log("Login successful");

      // Check if the user is an owner
      const ownersSnapshot = await getDocs(collectionGroup(db, 'owners'));
      let isOwner = false;
      
      ownersSnapshot.forEach(doc => {
        if (doc.id === user.uid) {
          isOwner = true;
        }
      });

      if (isOwner) {
        navigate("../ownerpage");
      } else {
        navigate("../memberpage");
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <div className="main-container">
      <div className="left-container">
        <div className="login-container">
          <Title className="login-text" level={2}>Войти</Title>
          <Form 
            name="login"
            initialValues={{ remember: true }}
            onFinish={handleLogin}
            onFinishFailed={onFinishFailed}
            layout="vertical"
          >
            <Form.Item
              label="Имя пользователя"
              name="email"
              rules={[{ required: true, message: 'Пожалуйста, введите ваш email!' }]}
            >
              <Input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email" 
              />
            </Form.Item>

            <Form.Item
              label="Пароль"
              name="password"
              rules={[{ required: true, message: 'Пожалуйста, введите ваш пароль!' }]}
            >
              <Input.Password 
                type='password'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="пароль" 
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" className="login-button">
                Логин
              </Button>
            </Form.Item>
          </Form>
          <div className="button-text">
            <Link to="/register">
              <Button type="link" className="registration-button">Регистрация</Button>
            </Link>
          </div>
        </div>
      </div>
      <div className="right-container" />
    </div>
  );
};

export default LoginPage;

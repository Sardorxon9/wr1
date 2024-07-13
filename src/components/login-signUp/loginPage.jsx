import React from 'react';
import { Form, Input, Button, Typography } from 'antd';
import { Link } from 'react-router-dom';
import './loginPage.css';

const { Title } = Typography;

const LoginPage = () => {
  const onFinish = (values) => {
    console.log('Success:', values);
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
            onFinish={onFinish}
            onFinishFailed={onFinishFailed}
            layout="vertical"
          >
            <Form.Item
              label="Имя пользователя"
              name="username"
            >
              <Input placeholder="email" />
            </Form.Item>

            <Form.Item
              label="Пароль"
              name="password"
            >
              <Input.Password placeholder="email" />
            </Form.Item>

            <Form.Item>
              <Link to="/mainpage">
                <Button type="primary" htmlType="submit" className="login-button">
                  Логин
                </Button>
              </Link>
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

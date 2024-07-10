import React from 'react';
import { Form, Input, Button, Typography } from 'antd';
import { Link } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import './registrationOwner.css';

const { Title } = Typography;

const RegistrationOwner = () => {
  const onFinish = (values) => {
    console.log('Success:', values);
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <div className="main-container">
      <div className="left-container">
        <div className="content-container">
          <div className="signup-container">
            <div className="header-container">
              <Link to="/" className="back-link">
                <ArrowLeftOutlined className="back-icon" />
              </Link>
              <Title className="signup-text" level={2}>Регистрация</Title>
            </div>
            <Form
              name="signup"
              initialValues={{ remember: true }}
              onFinish={onFinish}
              onFinishFailed={onFinishFailed}
              layout="vertical"
            >
              <Form.Item
                label="Имя"
                name="firstName"
                rules={[{ required: true, message: 'Пожалуйста, введите ваше имя!' }]}
              >
                <Input placeholder="Ваше имя" />
              </Form.Item>

              <Form.Item
                label="Фамилия"
                name="lastName"
                rules={[{ required: true, message: 'Пожалуйста, введите вашу фамилию!' }]}
              >
                <Input placeholder="Ваша фамилия" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[{ required: true, message: 'Пожалуйста, введите ваш email!' }]}
              >
                <Input type="email" placeholder="email" />
              </Form.Item>

              <Form.Item
                label="Пароль"
                name="password"
                rules={[{ required: true, message: 'Пожалуйста, введите ваш пароль!' }]}
              >
                <Input.Password placeholder="Пароль" />
              </Form.Item>

              <Form.Item
                label="Повторите пароль"
                name="confirmPassword"
                rules={[{ required: true, message: 'Пожалуйста, повторите ваш пароль!' }]}
              >
                <Input.Password placeholder="Повторите пароль" />
              </Form.Item>

              <Form.Item
                label="Организация"
                name="organization"
                rules={[{ required: true, message: 'Пожалуйста, введите вашу организацию!' }]}
              >
                <Input placeholder="Организация" />
              </Form.Item>

              <Form.Item>
                <Button type="primary" htmlType="submit" className="signup-button">
                  Регистрация
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
      <div className="right-container"></div>
    </div>
  );
};

export default RegistrationOwner;

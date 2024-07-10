import React from 'react';
import { Space, Typography, Input, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom'; // Import Link from react-router-dom
import './registrationOwner.css';

const { Text } = Typography;
const { Title } = Typography;

const RegistrationOwner = () => {
  return (
    <div className='main-container'>
      <div className="left-container">
        <form className="login-container" id='form1'>
          <div className='login-info'>
            <div className='login-text'>
              <Title level={4} className='singin-button'>Регистрация</Title>
            </div>

            <div className="login-username">
              <Space direction="vertical">
                <Text>Имя пользователя</Text>
              </Space> 
              <br />
              <Input placeholder="email" prefix={<UserOutlined />} />
              <br />
            </div>

            <div className="login-password">
              <Space direction="vertical">
                <Text>Пароль <span style={{color: 'red'}}>*</span> </Text>
              </Space> 
              <br />
              <Input placeholder="password" prefix={<UserOutlined />} />
              <br />
            </div>
          </div>

          <div className="button-text">
            <Link to="../success" className='registration-button'>
              <Button type="primary" className='login-button'>Регистрация</Button>
            </Link>
          </div>
        </form>
      </div>

      <div className="right-container">
      </div>
    </div>
  );
};

export default RegistrationOwner;
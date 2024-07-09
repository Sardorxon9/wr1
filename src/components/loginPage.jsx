import React, { useState } from 'react';
import { Space, Typography, Input, Button} from 'antd';
import { UserOutlined } from '@ant-design/icons';


const { Text, Link } = Typography;
const { Title } = Typography;
import './loginPage.css'

const Login = () => {
  
  return (
    <div className='main-container'>

        <div className="left-container">

            <div className="login-container">
                <div className='login-info'>
                    <div className='login-text'>
                    <Title level={4} className='singin-button'>Войти</Title>
                    </div>

                    <div className="login-username">
                        <Space direction="vertical">
                        <Text>Имя пользователя</Text>
                        </Space> 
                        <br />
                        <Input placeholder="email" prefix={<UserOutlined/>} />
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
                    <Button type="primary" className='login-button'>Логин</Button>
                    <br />
                    <Link href="" target="_blank" className='registration-button'>
                    Регистрация
                    </Link>
                </div>
                

            </div>
            
        </div>

        <div className="right-container">

        </div>

    </div>
  );
};

export default Login;

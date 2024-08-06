import React from 'react';
import { Button, Typography, Result } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const ErrorPage = () => {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate('/mainpage/dashboard');
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
       <Result
    status="500"
    title="Ошибка"
    subTitle="Что-то пошло не так.."
   
  />
      
      <Button type="primary" onClick={handleBackToDashboard}>
        Вернуться на главную
      </Button>
    </div>
  );
};

export default ErrorPage;

import React from 'react';
import { Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

const { Title } = Typography;

const ErrorPage = () => {
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate('/mainpage/dashboard');
  };

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <Title level={2}>Что-то пошло не так</Title>
      <Button type="primary" onClick={handleBackToDashboard}>
        Вернуться на главную
      </Button>
    </div>
  );
};

export default ErrorPage;

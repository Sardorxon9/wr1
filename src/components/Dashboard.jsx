import React from 'react';
import { Typography, Space } from 'antd';
import { useOutletContext } from 'react-router-dom';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { userDetails } = useOutletContext();
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = today.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div style={{ padding: 24, background: '#fff', borderRadius: 8 }}>
      <Space size="large" direction="vertical">
        <Text style={{ color: '#a9a9a9', fontSize: 14 }}>
          Сегодня: {formattedDate} | {formattedTime}
        </Text>
        <Title level={2} style={{ color: '#4d4d4d' }}>
          Добро пожаловать, <span style={{ fontWeight: 'normal' }}>{userDetails?.fullName}</span>
        </Title>
      </Space>
    </div>
  );
};

export default Dashboard;

import React from 'react';
import { Typography } from 'antd';


const { Title } = Typography;

const Dashboard = (props) => {
  return (
    <div style={{ padding: 24, background: '#fff', borderRadius: 8 }}>
      <Title level={2}>Dashboard Page</Title>
    </div>
  );
};

export default Dashboard;

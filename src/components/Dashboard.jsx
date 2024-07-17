import React from 'react';
import { Typography } from 'antd';
import { useOutletContext } from 'react-router-dom';


const { Title } = Typography;

const Dashboard = () => {

  const { userDetails } = useOutletContext();

  return (
    <div style={{ padding: 24, background: '#fff', borderRadius: 8 }}>

      <Title level={2}>Dashboard Page of {userDetails?.email}</Title>
      
    </div>
  );
};

export default Dashboard;

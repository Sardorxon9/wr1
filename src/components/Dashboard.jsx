import React from 'react';
import { Typography } from 'antd';
import { useOutletContext } from 'react-router-dom';


const { Title } = Typography;

const Dashboard = () => {

  const { userDetails } = useOutletContext();
  console.log(333, userDetails)
  return (
    <div style={{ padding: 24, background: '#fff', borderRadius: 8 }}>

      <Title level={2}>Dashboard Page of <u>{userDetails?.organizationName}</u></Title>
      
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import {
  DashboardOutlined,
  LogoutOutlined,
  UserOutlined,
  FormOutlined,
  MenuUnfoldOutlined,
  OrderedListOutlined,
  MenuFoldOutlined
} from '@ant-design/icons';
import { Layout, Menu, Typography, Avatar, Space, Button, theme } from 'antd';
import { Link, Outlet } from 'react-router-dom';
import './mainPage.css';
import { auth, db } from '../login-signUp/firebase';
import { getDoc, doc } from "firebase/firestore";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainPage = () => {
  const [userDetails, setUserDetails] = useState(null);

  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      console.log(user)
      const docRef = doc(db, "users-info", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserDetails(docSnap.data());
        console.log(1, docSnap.data());
      }
      else {
        console.log("No logged in user");
      }
    })
  };
  useEffect(() => {
    fetchUserData();
  }, [])

  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '1',
      icon: <DashboardOutlined />,
      label: <Link to="/mainpage/dashboard">Dashboard</Link>,
    },
    {
      key: '2',
      icon: <FormOutlined />,
      label: <Link to="/mainpage/create-order">Добавить заказ</Link>,
    },
    {
      key: '3',
      icon: <OrderedListOutlined />,
      label: <Link to="/mainpage/order-list">Заказы</Link>,
    },
    {
      key: '4',
      icon: <LogoutOutlined />,
      label: <Link to="/">Log Out</Link>,
    },
  ];

  return (
    
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="whiteray-logo">
          {collapsed ? 'W' : 'WhiteRay'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultSelectedKeys={['1']}
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: 0,
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
            <div className="userdata" style={{ display: 'flex', alignItems: 'center' }}>
              <Avatar size="large" icon={<UserOutlined />} className="user-avatar" />
              <Space direction="vertical" size={0} className="user-info" style={{ marginLeft: '10px' }}>
                <Text className="user-name" strong>{userDetails?.firstName}</Text>
                <Text className="user-role">Администратор</Text>
              </Space>
            </div>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: '100%',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainPage;

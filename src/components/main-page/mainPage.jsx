import React, { useState, useEffect } from 'react';
import {
  DashboardOutlined,
  LogoutOutlined,
  UserOutlined,
  FormOutlined,
  MenuUnfoldOutlined,
  OrderedListOutlined,
  MenuFoldOutlined,
  TeamOutlined,
  AppstoreAddOutlined,
} from '@ant-design/icons';

import { Layout, Menu, Typography, Avatar, Space, Button, Spin, notification,theme } from 'antd';
import { Link, Outlet } from 'react-router-dom';
import './mainPage.css';
import { auth, db } from '../login-signUp/firebase';
import { getDoc, doc } from "firebase/firestore";

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainPage = () => {
  const [userDetails, setUserDetails] = useState(null);
  const [organizationName, setOrganizationName] = useState('');
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          const userDocRef = doc(db, "owner-users", user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            setUserDetails(userData);

            const organizationDocRef = doc(db, "organizations", userData.organizationID);
            const organizationDocSnap = await getDoc(organizationDocRef);
            if (organizationDocSnap.exists()) {
              setOrganizationName(organizationDocSnap.data().name);
            } else {
              console.log("No such organization!");
            }
          } else {
            console.log("No such user!");
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          notification.error({
            message: 'Ошибка',
            description: 'Не удалось загрузить данные пользователя.',
          });
        }
        setLoading(false);
      }
    });
  };

  useEffect(() => {
    fetchUserData();
  }, []);

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
      icon: <TeamOutlined />,
      label: <Link to="/mainpage/employees">Сотрудники</Link>,
    },
    {
      key: '5',
      icon: <AppstoreAddOutlined />,
      label: <Link to="/mainpage/products">Продукты</Link>,
    },
    {
      key: '6',
      icon: <LogoutOutlined />,
      label: <Link to="/">Log Out</Link>,
    },
  ];


  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="whiteray-logo">
          {collapsed ? 'W' : organizationName || 'WhiteRay'}
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
                <Text className="user-name" strong>{userDetails?.fullName}</Text>
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
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
              <Spin />
            </div>
          ) : (
            <Outlet context={{ userDetails }} />
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainPage;

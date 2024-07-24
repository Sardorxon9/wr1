import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Avatar, Space, Button, theme } from 'antd';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { auth, db } from './login-signUp/firebase';
import { getDocs, collection, query, where } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  DashboardOutlined,
  LogoutOutlined,
  UserOutlined,
  FormOutlined,
  MenuUnfoldOutlined,
  OrderedListOutlined,
  MenuFoldOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import './main-page/mainPage.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MemberPage = () => {
  const [userDetails, setUserDetails] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const fetchUserData = async (user) => {
    try {
      const organizationsRef = collection(db, "organizations");
      const organizationsSnapshot = await getDocs(organizationsRef);

      organizationsSnapshot.forEach(async (orgDoc) => {
        const ownersRef = collection(orgDoc.ref, "members");
        const ownerQuery = query(ownersRef, where("email", "==", user.email));
        const ownerSnapshot = await getDocs(ownerQuery);
        
        ownerSnapshot.forEach((ownerDoc) => {
          setUserDetails(ownerDoc.data());
          console.log(ownerDoc.data());
        });
      });
    } catch (error) {
      console.error("Error fetching user data: ", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        fetchUserData(user);
      } else {
        navigate("/");
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

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
      icon: <TeamOutlined />,
      label: <Link to="/mainpage/employees">Сотрудники</Link>,
    },
    {
      key: '5',
      icon: <LogoutOutlined />,
      label: <span onClick={handleLogout}>Log Out</span>,
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
                <Text className="user-role">Member</Text>
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
          <Outlet context={{ userDetails }} />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MemberPage;

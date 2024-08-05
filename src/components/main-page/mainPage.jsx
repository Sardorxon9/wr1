import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Avatar, Space, Button, Spin, notification, theme } from 'antd';
import { useLocation, Link, Outlet, useNavigate } from 'react-router-dom';
import { auth, db } from '../login-signUp/firebase';
import { getDoc, doc } from "firebase/firestore";
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
import './mainPage.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState(null);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationID, setOrganizationID] = useState(''); // State for organizationID
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    if (auth.currentUser?.uid) {
      fetchUserData();
    } else {
      console.error('No user found');
      navigate("/error"); // Example redirect to an error page
    }
  }, []);

  const fetchUserData = async () => {
    try {
      const userDocRef = doc(db, "owner-users", auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        setUserDetails(userData);

        if (userData.organizationID) {
          const organizationDocRef = doc(db, "organizations", userData.organizationID);
          const organizationDocSnap = await getDoc(organizationDocRef);
          if (organizationDocSnap.exists()) {
            setOrganizationName(organizationDocSnap.data().name);
            setOrganizationID(organizationDocSnap.data().organizationID); // Set organizationID
          } else {
            console.log("No such organization!");
          }
        } else {
          console.error("No organizationID found for user");
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
  };

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
          items={[
            {
              key: '1',
              icon: <DashboardOutlined />,
              label: <Link to="/mainpage/dashboard" state={{ organizationID }}>Dashboard</Link>,
            },
            {
              key: '2',
              icon: <FormOutlined />,
              label: <Link to="/mainpage/create-order" state={{ organizationID }}>Добавить заказ</Link>,
            },
            {
              key: '3',
              icon: <OrderedListOutlined />,
              label: <Link to="/mainpage/order-list" state={{ organizationID }}>Заказы</Link>,
            },
            {
              key: '4',
              icon: <TeamOutlined />,
              label: <Link to="/mainpage/employees" state={{ organizationID }}>Сотрудники</Link>,
            },
            {
              key: '5',
              icon: <AppstoreAddOutlined />,
              label: <Link to="/mainpage/products" state={{ organizationID }}>Продукты</Link>,
            },
            {
              key: '6',
              icon: <LogoutOutlined />,
              label: <Link to="/">Log Out</Link>,
            },
          ]}
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
            <Outlet context={{ organizationID }} />
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainPage;

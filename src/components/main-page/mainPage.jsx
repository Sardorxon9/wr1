import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Avatar, Space, Button, Spin, notification, theme } from 'antd';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { auth, db } from '../login-signUp/firebase';
import { getDoc, doc, collection, getDocs } from "firebase/firestore";
import {
  DashboardOutlined,
  LogoutOutlined,
  UserOutlined,
  OrderedListOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  TeamOutlined,
  AppstoreAddOutlined,
  FormOutlined
} from '@ant-design/icons';
import './mainPage.css';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const MainPage = () => {
  const navigate = useNavigate();
  const [userDetails, setUserDetails] = useState(null);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationID, setOrganizationID] = useState('');
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
      navigate("/error");
    }
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchUserData();
      } else {
        console.error('No user found');
        navigate("/error");
      }
    });
    return () => unsubscribe(); // Cleanup the listener on component unmount
  }, []);
  


  const fetchUserData = async () => {
    try {
      const userUid = auth.currentUser.uid;

      // Check if the user is an owner
      const ownerDocRef = doc(db, "owner-users", userUid);
      const ownerDocSnap = await getDoc(ownerDocRef);
      if (ownerDocSnap.exists()) {
        const userData = ownerDocSnap.data();
        userData.role = 'owner'; // Set role as owner
        setUserDetails(userData);

        if (userData.organizationID) {
          setOrganizationID(userData.organizationID);
          const organizationDocRef = doc(db, "organizations", userData.organizationID);
          const organizationDocSnap = await getDoc(organizationDocRef);
          if (organizationDocSnap.exists()) {
            setOrganizationName(organizationDocSnap.data().name);
          } else {
            console.log("No such organization!");
          }
        } else {
          console.error("No organizationID found for user");
        }
      } else {
        // User is not an owner, check if they are a member
        let isMember = false;
        const organizationsRef = collection(db, "organizations");
        const orgsSnapshot = await getDocs(organizationsRef);
        for (const orgDoc of orgsSnapshot.docs) {
          const orgID = orgDoc.id;
          const memberDocRef = doc(db, `organizations/${orgID}/members`, userUid);
          const memberDocSnap = await getDoc(memberDocRef);

          if (memberDocSnap.exists()) {
            const memberData = memberDocSnap.data();
            memberData.role = 'member'; // Set role as member
            setUserDetails(memberData);
            setOrganizationID(memberData.organizationID);
            setOrganizationName(orgDoc.data().name);
            isMember = true;
            break;
          }
        }

        if (!isMember) {
          console.error("No such user in owner-users or members");
        }
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
          {collapsed ? '..' : organizationName || 'Loading...'}
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
            ...(userDetails?.role === 'owner' ? [
              {
                key: '2',
                icon: <FormOutlined />,
                label: <Link to="/mainpage/create-order" state={{ organizationID }}>Добавить заказ</Link>,
              }
            ] : []),
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
                <Text className="user-role">{userDetails?.role === 'owner' ? 'Администратор' : 'Участник'}</Text>
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
            <Outlet context={{ organizationID, role: userDetails?.role, userDetails }} />
          )}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainPage;

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Typography, Avatar, Space, Button, Spin, notification, theme, Drawer, Modal } from 'antd';
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
  FormOutlined,
  MenuOutlined,
  CloseOutlined,
  CodeSandboxOutlined,
  GroupOutlined, 
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
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

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

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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
          console.error("No organizationID found for owner user");
        }
      } else {
        // User is not an owner, check if they are a member
        const organizationsRef = collection(db, "organizations");
        const orgsSnapshot = await getDocs(organizationsRef);

        let isMember = false;

        for (const orgDoc of orgsSnapshot.docs) {
          const orgID = orgDoc.id;
          const memberDocRef = doc(db, `organizations/${orgID}/members`, userUid);
          const memberDocSnap = await getDoc(memberDocRef);

          if (memberDocSnap.exists()) {
            const memberData = memberDocSnap.data();
            memberData.role = 'member'; // Set role as member
            setUserDetails(memberData);
            setOrganizationID(orgID); // Set organization ID from the organization where the user is a member
            setOrganizationName(orgDoc.data().name);
            isMember = true;
            break; // Exit the loop once the user is found in any organization
          }
        }

        if (!isMember) {
          console.error("User not found in owner-users or any organization's members");
          navigate("/error"); // Redirect to error page if user is not found in either collection
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

  const handleLogout = () => {
    auth.signOut().then(() => {
      navigate('/login');
      notification.success({
        message: 'Успех',
        description: 'Вы успешно вышли из системы.',
      });
    }).catch((error) => {
      console.error("Error logging out:", error);
      notification.error({
        message: 'Ошибка',
        description: 'Не удалось выйти из системы.',
      });
    });
  };

  const showLogoutModal = () => {
    setLogoutModalVisible(true);
  };

  const hideLogoutModal = () => {
    setLogoutModalVisible(false);
  };

  const menuItems = [
    {
      key: '1',
      icon: <DashboardOutlined />,
      label: <Link to="/mainpage/dashboard" state={{ organizationID }} onClick={() => setDrawerVisible(false)}>Dashboard</Link>,
    },
    ...(userDetails?.role === 'owner' ? [
      {
        key: '2',
        icon: <FormOutlined />,
        label: <Link to="/mainpage/create-order" state={{ organizationID }} onClick={() => setDrawerVisible(false)}>Добавить заказ</Link>,
      }
    ] : []),
    {
      key: '3',
      icon: <OrderedListOutlined />,
      label: <Link to="/mainpage/order-list" state={{ organizationID }} onClick={() => setDrawerVisible(false)}>Заказы</Link>,
    },
    {
      key: '4',
      icon: <TeamOutlined />,
      label: <Link to="/mainpage/employees" state={{ organizationID }} onClick={() => setDrawerVisible(false)}>Сотрудники</Link>,
    },
    {
      key: '5',
      icon: <AppstoreAddOutlined />,
      label: <Link to="/mainpage/products" state={{ organizationID }} onClick={() => setDrawerVisible(false)}>Продукты</Link>,
    },
    {
      key: '6',
      icon: <UserOutlined />,
      label: <Link to="/mainpage/customers" state={{ organizationID }} onClick={() => setDrawerVisible(false)}>Клиенты</Link>,
    },
    {
      key: '7',
      icon: <CodeSandboxOutlined />,
      // Ensure organizationID is defined before using it in the Link
      label: <Link to="/mainpage/materials" state={organizationID ? { organizationID } : {}} onClick={() => setDrawerVisible(false)}>Сырье</Link>,
    },
    {
      key: '8',
      icon: <GroupOutlined/>,
      // Ensure organizationID is defined before using it in the Link
      label: <Link to="/mainpage/manage-paper" state={organizationID ? { organizationID } : {}} onClick={() => setDrawerVisible(false)}>Бумаги</Link>,
    },
    {
      key: '9',
      icon: <LogoutOutlined style={{ color: '#f5222d' }} />, // Red color for logout icon
      label: (
        <Button type="link" onClick={showLogoutModal} style={{color: "#d9d9d9",  paddingLeft: 0,  }}> {/* Added margin for spacing */}
          Выйти
        </Button>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer
          title={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{organizationName || 'Menu'}</span>
              <Button type="text" icon={<CloseOutlined />} onClick={() => setDrawerVisible(false)} />
            </div>
          }
          placement="left"
          closable={false}
          onClose={() => setDrawerVisible(false)}
          visible={drawerVisible}
          bodyStyle={{ padding: 0 }}
        >
          <Menu theme="dark" mode="inline" items={menuItems} />
        </Drawer>
      ) : (
        <Sider trigger={null} collapsible collapsed={collapsed}>
          <div className="whiteray-logo">
            {collapsed ? '..' : organizationName || 'Loading...'}
          </div>
          <Menu theme="dark" mode="inline" defaultSelectedKeys={['1']} items={menuItems} />
        </Sider>
      )}
      <Layout>
        <Header
          style={{
            padding: 0,
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {isMobile ? (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />
          ) : (
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
          )}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
            <div className="userdata" style={{ display: 'flex', alignItems: 'center' }}>
              <Avatar size="large" icon={<UserOutlined />} className="user-avatar" />
              <Space direction="vertical" size={0} className="user-info" style={{ marginLeft: '10px' }}>
                <Text className="user-name" strong>{userDetails?.fullName}</Text>
                <Text className="user-role">{userDetails?.role === 'owner' ? 'Администратор' : 'Сотрудник'}</Text>
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
      {/* Logout Confirmation Modal */}
      <Modal
        title="Подтвердите выход"
        visible={logoutModalVisible}
        onOk={handleLogout}
        onCancel={hideLogoutModal}
        okText="Выйти"
        cancelText="Отмена"
      >
        <Text>Вы уверены, что хотите выйти?</Text>
      </Modal>
    </Layout>
  );
};

export default MainPage;

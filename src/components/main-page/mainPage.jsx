// src/components/MainPage.jsx
import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Typography,
  Avatar,
  Space,
  Button,
  Spin,
  notification,
  theme,
  Drawer,
  Modal,
  Alert,
} from 'antd';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../login-signUp/firebase';
import { getDoc, doc, collection, getDocs, onSnapshot } from "firebase/firestore";
import {
  DashboardOutlined,
  LogoutOutlined,
  UserOutlined,
  OrderedListOutlined,
  TeamOutlined,
  AppstoreAddOutlined,
  FormOutlined,
  MenuOutlined,
  CloseOutlined,
  CodeSandboxOutlined,
  GroupOutlined,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import './mainPage.css';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

const MainPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userDetails, setUserDetails] = useState(null);
  const [organizationName, setOrganizationName] = useState('');
  const [organizationID, setOrganizationID] = useState('');
  const [loading, setLoading] = useState(true);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [alertMessages, setAlertMessages] = useState([]);
  const [detailedAlertData, setDetailedAlertData] = useState({
    customers: [],
    standardRolls: [],
  });
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        fetchUserData(user.uid);
      } else {
        console.error('No user found');
        navigate("/error");
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (userUid) => {
    try {
      const ownerDocRef = doc(db, "owner-users", userUid);
      const ownerDocSnap = await getDoc(ownerDocRef);

      if (ownerDocSnap.exists()) {
        const userData = ownerDocSnap.data();
        userData.role = 'owner';
        setUserDetails(userData);

        if (userData.organizationID) {
          setOrganizationID(userData.organizationID);
          const organizationDocRef = doc(db, "organizations", userData.organizationID);
          const organizationDocSnap = await getDoc(organizationDocRef);
          if (organizationDocSnap.exists()) {
            setOrganizationName(organizationDocSnap.data().name);
          }
          setupAlertListeners(userData.organizationID);
        }
      } else {
        const organizationsRef = collection(db, "organizations");
        const orgsSnapshot = await getDocs(organizationsRef);

        let isMember = false;

        for (const orgDoc of orgsSnapshot.docs) {
          const orgID = orgDoc.id;
          const memberDocRef = doc(db, `organizations/${orgID}/members`, userUid);
          const memberDocSnap = await getDoc(memberDocRef);

          if (memberDocSnap.exists()) {
            const memberData = memberDocSnap.data();
            memberData.role = 'member';
            setUserDetails(memberData);
            setOrganizationID(orgID);
            setOrganizationName(orgDoc.data().name);
            isMember = true;
            setupAlertListeners(orgID);
            break;
          }
        }

        if (!isMember) {
          console.error("User not found in owner-users or any organization's members");
          navigate("/error");
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

  const setupAlertListeners = (orgID) => {
    const customersRef = collection(db, `organizations/${orgID}/customers`);
    const unsubscribeCustomers = onSnapshot(customersRef, (snapshot) => {
      const customersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      const customersWithZeroPaper = customersData.filter(customer => customer.paper?.available === 0);
      
      const standardRollsRef = collection(db, `organizations/${orgID}/standard-rolls`);
      const unsubscribeStandardRolls = onSnapshot(standardRollsRef, (rollSnapshot) => {
        const standardRollsData = rollSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        const rollsWithZeroAvailable = standardRollsData.filter(roll => roll.available === 0);

        if (customersWithZeroPaper.length > 0 || rollsWithZeroAvailable.length > 0) {
          const customerMessages = customersWithZeroPaper.map(customer => `Отсутствует бумага для клиента "${customer.brand}"`);
          const rollMessages = rollsWithZeroAvailable.map(roll => `Рулон бумаги (стандарт дизайн) для "${roll.product.categoryName} → ${roll.product.productTitle}" отсутствует`);
          setAlertMessages([...customerMessages, ...rollMessages]);

          setDetailedAlertData({
            customers: customersWithZeroPaper,
            standardRolls: rollsWithZeroAvailable,
          });
        } else {
          setAlertMessages([]);
          setDetailedAlertData({
            customers: [],
            standardRolls: [],
          });
        }
      });

      return () => {
        unsubscribeStandardRolls();
      };
    });

    return () => {
      unsubscribeCustomers();
    };
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

  const showDetailModal = () => {
    setIsDetailModalVisible(true);
  };

  const hideDetailModal = () => {
    setIsDetailModalVisible(false);
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
      icon: alertMessages.some(msg => msg.includes('бумага для клиента')) ? <ExclamationCircleFilled style={{color: "#ff4d4f"}} /> : <UserOutlined />,
      label: <Link to="/mainpage/customers" state={{ organizationID }} onClick={() => setDrawerVisible(false)}>Клиенты</Link>,
    },
    {
      key: '7',
      icon: <CodeSandboxOutlined />,
      label: <Link to="/mainpage/materials" state={organizationID ? { organizationID } : {}} onClick={() => setDrawerVisible(false)}>Сырье</Link>,
    },
    {
      key: '8',
      icon: <GroupOutlined />,
      label: <Link to="/mainpage/manage-paper" state={organizationID ? { organizationID } : {}} onClick={() => setDrawerVisible(false)}>Бумаги</Link>,
    },
    {
      key: '9',
      icon: <LogoutOutlined style={{ color: '#f5222d' }} />,
      label: (
        <Button type="link" onClick={showLogoutModal} style={{ color: "#d9d9d9", paddingLeft: 0 }}>
          Выйти
        </Button>
      ),
    },
  ];

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100vh',
          }}
        >
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

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
        <Sider trigger={null} collapsible collapsed={false}>
          <div className="whiteray-logo">
            {organizationName || 'Loading...'}
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
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {isMobile && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              style={{
                fontSize: '16px',
                marginLeft: 16,
              }}
            />
          )}
          {!isMobile && alertMessages.length > 0 && (
            <Alert
              message={
                alertMessages.length > 1
                  ? (
                    <span>
                      Отсутствует бумага для некоторых клиентов и/или рулонов.{' '}
                      <Button type="link" onClick={showDetailModal}>
                        Подробно
                      </Button>
                    </span>
                  )
                  : alertMessages[0]
              }
              type="warning"
              showIcon
              style={{ maxWidth: '60%', margin: '0 16px', flexShrink: 0 }}
            />
          )}
          <div className="userdata">
            <Avatar size="large" icon={<UserOutlined />} className="user-avatar" />
            <Space direction="vertical" size={0} className="user-info">
              <Text className="user-name" strong>{userDetails?.fullName}</Text>
              <Text className="user-role">{userDetails?.role === 'owner' ? 'Администратор' : 'Сотрудник'}</Text>
            </Space>
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
          <Outlet context={{ organizationID, role: userDetails?.role, userDetails }} />
        </Content>
      </Layout>
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
      <Modal
        title="Детали оповещений"
        visible={isDetailModalVisible}
        onCancel={hideDetailModal}
        footer={[
          <Button key="close" onClick={hideDetailModal}>
            Закрыть
          </Button>,
        ]}
      >
        {detailedAlertData.customers.length > 0 && (
          <div>
            <Title level={5}>Клиенты без бумаги:</Title>
            <ul className="modal-list">
              {detailedAlertData.customers.map(customer => (
                <li key={customer.id}>
                  {customer.brand}
                </li>
              ))}
            </ul>
          </div>
        )}
        {detailedAlertData.standardRolls.length > 0 && (
          <div>
            <Title level={5}>Стандартные рулоны без доступного количества:</Title>
            <ul className="modal-list">
              {detailedAlertData.standardRolls.map(roll => (
                <li key={roll.id}>
                  {roll.product.categoryName} &rarr; {roll.product.productTitle}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default MainPage;
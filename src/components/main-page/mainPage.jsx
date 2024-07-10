import React, { useState } from 'react';
import { Layout, Menu, Typography, Avatar, Space, Button } from 'antd';
import { Link } from 'react-router-dom';
import { DashboardOutlined, LogoutOutlined, UserOutlined, MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import './mainPage.css';

const { Header, Sider, Content, Footer } = Layout;
const { Title, Text } = Typography;

const MainPage = () => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div className="logo" />
        <Menu theme="dark" defaultSelectedKeys={['1']} mode="inline">
          <Menu.Item key="1" icon={<DashboardOutlined />}>
            <Link to="/dashboard">Dashboard</Link>
          </Menu.Item>
          <Menu.Item key="2" icon={<LogoutOutlined />}>
            <Link to="/">Log Out</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout className="site-layout">
        <Header className="header" style={{ padding: 0 }}>
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
          <div className="header-content">
            <div className="header-left">Whiteray</div>
            <div className="userdata">
              <Avatar size="large" icon={<UserOutlined />} className="user-avatar" />
              <Space direction="vertical" size={0} className="user-info">
                <Text className="user-name" strong>Бахтиер Орипов</Text>
                <Text className="user-role">Администратор</Text>
              </Space>
            </div>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 360,
            background: '#fff',
            borderRadius: '8px',
          }}
        >
          <Title level={2}>Welcome</Title>
        </Content>
        <Footer style={{ textAlign: 'center' }}>Ant Design Layout Example ©2024</Footer>
      </Layout>
    </Layout>
  );
};

export default MainPage;

import React, { useState, useEffect } from 'react';
import { Card, Avatar, Typography, Button, Modal, Input, message, Select, Space, Spin } from 'antd';
import { ClockCircleOutlined, UserOutlined, CopyOutlined } from '@ant-design/icons';
import { auth, db } from '../login-signUp/firebase';
import { collection, addDoc, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { sendSignInLinkToEmail } from 'firebase/auth';
import './Employees.css';

const { Title, Text } = Typography;
const { Option } = Select;

const Employees = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isResultModalVisible, setIsResultModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [loading, setLoading] = useState(false);
  const [signupLink, setSignupLink] = useState('');
  const [employees, setEmployees] = useState([]);
  const [organizationID, setOrganizationID] = useState('');

  const fetchUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      const userDocRef = doc(db, 'owner-users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        setOrganizationID(userDocSnap.data().organizationID);
      }
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const employeesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/employees`));
    const employeesData = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEmployees(employeesData);
    setLoading(false);
  };

  useEffect(() => {
    if (organizationID) {
      fetchEmployees();
    }
  }, [organizationID]);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleInviteMember = async () => {
    setLoading(true);
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/register-member?email=${email}&organizationID=${organizationID}`,
        handleCodeInApp: true,
        iOS: {
          bundleId: 'com.example.ios'
        },
        android: {
          packageName: 'com.example.android',
          installApp: true,
          minimumVersion: '12'
        },
        dynamicLinkDomain: 'your-dynamic-link-domain.page.link'
      };

      await sendSignInLinkToEmail(auth, email, actionCodeSettings);

      await addDoc(collection(db, `organizations/${organizationID}/employees`), {
        email,
        role,
        signedUp: false,
      });

      window.localStorage.setItem('emailForSignIn', email);

      const link = `${window.location.origin}/register-member?email=${email}&organizationID=${organizationID}`;
      setSignupLink(link);

      message.success('Invitation link was generated!');
      setIsModalVisible(false);
      setIsResultModalVisible(true);
    } catch (error) {
      message.error('Error sending invitation: ' + error.message);
    }
    setLoading(false);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(signupLink);
    message.success('Signup link copied to clipboard!');
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEmail('');
    setRole('member');
  };

  const handleResultModalClose = () => {
    setIsResultModalVisible(false);
    setSignupLink('');
  };

  return (
    <div>
      <Title level={2}>Сотрудники</Title>
      <div className="employees-container">
        {loading ? (
          <Spin size="large" />
        ) : (
          employees.map((employee, index) => (
            <Card key={index} className="employee-card">
              <div className="employee-avatar">
                <Avatar size={64} icon={<UserOutlined />} />
              </div>
              <div className="employee-info">
                {employee.signedUp ? (
                  <>
                    <Text className="employee-name" strong>{employee.name}</Text>
                    <Text className="employee-role">{employee.role}</Text>
                    <Text className="employee-email">{employee.email}</Text>
                  </>
                ) : (
                  <>
                    <div className="employee-pending-info">
                      <Text className="employee-pending" strong>Pending-for signup</Text>
                      <ClockCircleOutlined className="employee-pending-icon" />
                    </div>
                    <Text className="employee-role">{employee.role}</Text>
                    <Text className="employee-email">{employee.email}</Text>
                  </>
                )}
              </div>
            </Card>
          ))
        )}
      </div>
      <Button type="primary" onClick={showModal}>Invite member</Button>
      <Modal
        title="Invite member"
        visible={isModalVisible}
        onOk={handleInviteMember}
        onCancel={handleCancel}
        okText="Пригласить"
        cancelText="Отменить"
      >
        <Input
          placeholder="Enter email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <Select defaultValue="member" style={{ width: '100%', marginTop: 16 }} onChange={value => setRole(value)}>
          <Option value="admin">Admin</Option>
          <Option value="member">Member</Option>
        </Select>
      </Modal>
      <Modal
        title="Invite member"
        visible={isResultModalVisible}
        onCancel={handleResultModalClose}
        footer={[
          <Button key="close" onClick={handleResultModalClose}>
            Close
          </Button>,
        ]}
      >
        <p>Пользователь был приглашен. Ссылка для регистрации отправлена на указанный email.</p>
        <Space direction="horizontal" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Text>{signupLink}</Text>
          <Button icon={<CopyOutlined />} onClick={handleCopyLink} />
        </Space>
      </Modal>
    </div>
  );
};

export default Employees;

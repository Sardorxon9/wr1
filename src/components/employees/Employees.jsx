import React, { useState, useEffect } from 'react';
import { Card, Avatar, Typography, Button, Modal, Input, message, Spin } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import { db } from '../login-signUp/firebase';
import { collection, addDoc, getDocs, doc, getDoc } from "firebase/firestore";
import { useOutletContext } from 'react-router-dom';

const { Title, Text } = Typography;

const Employees = () => {
  const { organizationID } = useOutletContext(); // Get organizationID from context
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [fetchedOrganizationID, setFetchedOrganizationID] = useState(null);

  useEffect(() => {
    if (organizationID) {
      fetchOrganizationData();
    } else {
      console.error('Organization ID is not defined');
    }
  }, [organizationID]);

  const fetchOrganizationData = async () => {
    setLoading(true);
    try {
      const organizationDocRef = doc(db, "organizations", organizationID);
      const organizationDocSnap = await getDoc(organizationDocRef);
      if (organizationDocSnap.exists()) {
        const orgData = organizationDocSnap.data();
        setFetchedOrganizationID(orgData.organizationID); // Set the organizationID
        fetchEmployees(orgData.organizationID);
      } else {
        console.error("No such organization!");
      }
    } catch (error) {
      console.error("Error fetching organization data:", error);
      message.error("Ошибка при загрузке данных организации.");
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async (orgID) => {
    if (!orgID) return;

    try {
      const membersRef = collection(db, `organizations/${orgID}/members`);
      const querySnapshot = await getDocs(membersRef);
      const membersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEmployees(membersData);
    } catch (error) {
      console.error("Error fetching employees:", error);
      message.error("Ошибка при загрузке сотрудников.");
    }
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleInvite = async () => {
    if (!email) {
      message.error('Введите действительный адрес электронной почты.');
      return;
    }

    if (!fetchedOrganizationID) {
      message.error('Организация не определена.');
      return;
    }

    setLoading(true);
    try {
      // Add to the organization's members collection
      await addDoc(collection(db, `organizations/${fetchedOrganizationID}/members`), {
        email,
        status: 'pending',
      });

      // Add to the invited-users collection
      await addDoc(collection(db, "invited-users"), {
        email,
        organizationID: fetchedOrganizationID,
        organizationName: 'Your Organization Name', // Replace with actual organization name
        status: 'pending',
      });

      message.success('Пользователь приглашен.');
      setIsModalVisible(false);
      setEmail('');
      fetchEmployees(fetchedOrganizationID);
    } catch (error) {
      console.error("Error inviting user:", error);
      message.error("Ошибка при приглашении пользователя.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Title level={2}>Сотрудники</Title>
      <div className="employees-container">
        {loading ? (
          <Spin size="large" />
        ) : (
          employees.map((employee) => (
            <Card key={employee.id} className="employee-card">
              <div className="employee-avatar">
                <Avatar size={64} icon={<UserOutlined />} />
              </div>
              <div className="employee-info">
                <Text className="employee-email">{employee.email}</Text>
                <Text className="employee-status">
                  Статус: {employee.status === 'pending' ? 'Ожидает' : 'Активный'}
                </Text>
              </div>
            </Card>
          ))
        )}
      </div>
      <Button type="primary" onClick={showModal}>Пригласить пользователя</Button>
      <Modal
        title="Пригласить пользователя"
        visible={isModalVisible}
        onOk={handleInvite}
        onCancel={() => setIsModalVisible(false)}
        okText="Пригласить"
        cancelText="Отменить"
      >
        <Input
          placeholder="Введите email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default Employees;

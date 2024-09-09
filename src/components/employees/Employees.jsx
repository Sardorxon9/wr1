import React, { useState, useEffect } from 'react';
import { Card, Avatar, Typography, Button, Modal, Input, message,Badge, Spin } from 'antd';
import { UserOutlined, DeleteOutlined, ClockCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { db } from '../login-signUp/firebase';
import { collection, addDoc, getDocs, doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { useOutletContext } from 'react-router-dom';

const { Title, Text } = Typography;

const Employees = () => {
  const { organizationID, role } = useOutletContext(); // Get organizationID and role from context
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
        setFetchedOrganizationID(orgData.organizationID);
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
      // Generate a unique ID for the new member
      const newMemberRef = doc(collection(db, "invited-users"));
      const newMemberID = newMemberRef.id;

      // Add to the organization's members collection
      await setDoc(doc(db, `organizations/${fetchedOrganizationID}/members`, newMemberID), {
        email,
        status: 'pending',
        role: 'member',
        organizationID: fetchedOrganizationID,
      });

      // Add to the invited-users collection
      await setDoc(newMemberRef, {
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

  const handleDeleteEmployee = async (memberId, email) => {
    setLoading(true);
    try {
      // Delete from the organization's members collection
      await deleteDoc(doc(db, `organizations/${fetchedOrganizationID}/members`, memberId));
  
      // Delete from the invited-users collection (find by email)
      const invitedUsersRef = collection(db, 'invited-users');
      const invitedUsersSnapshot = await getDocs(query(invitedUsersRef, where('email', '==', email)));
  
      invitedUsersSnapshot.forEach(async (docSnapshot) => {
        await deleteDoc(doc(db, 'invited-users', docSnapshot.id));
      });
  
      message.success('Пользователь удален.');
      setEmployees(employees.filter(employee => employee.id !== memberId));
    } catch (error) {
      console.error("Error deleting employee:", error);
      message.error("Ошибка при удалении пользователя.");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div>
      <Title level={2}>Сотрудники</Title>
      <div className="employees-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        {loading ? (
          <Spin size="large" />
        ) : (
          employees.map((employee) => (
            <Card
            key={employee.id}
            className="employee-card"
            actions={
              role === 'owner' ? [
                <DeleteOutlined key="delete" onClick={() => handleDeleteEmployee(employee.id, employee.email)} />,
              ] : []
            }
            style={{ width: 300, textAlign: 'center' }}
          >
            <div className="employee-avatar">
              <Avatar size={64} icon={employee.status === 'pending' ? <ExclamationCircleOutlined /> : <UserOutlined />} />
            </div>
            <div className="employee-info" style={{ marginTop: '12px' }}>
              {employee.status === 'pending' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Badge
                      status="warning"
                      color="orange"
                      text={<span style={{ marginLeft: '8px', fontWeight: 'bold' }}>Ожидает регистрации</span>} // Add margin between badge and text
                    />
                  </div>
                  <Text style={{ color: '#8c8c8c', display: 'block', marginTop: '8px' }}>{employee.email}</Text> {/* Display email */}
                </>
              ) : (
                <>
                  <Text style={{ fontWeight: 'bold', fontSize: '18px' }}>{employee.firstName} {employee.lastName}</Text>
                  <Text style={{ color: '#1890ff', display: 'block', margin: '5px 0' }}>{employee.role}</Text>
                  <Text style={{ color: '#8c8c8c', display: 'block' }}>{employee.email}</Text>
                </>
              )}
            </div>
          </Card>
          
          
          ))
        )}
      </div>
      {role === 'owner' && (
        <Button type="primary" onClick={showModal} style={{ marginTop: '24px' }}>Пригласить пользователя</Button>
      )}
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

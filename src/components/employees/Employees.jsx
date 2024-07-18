import React, { useState } from 'react';
import { Card, Avatar, Typography, Button, Modal, Input, message } from 'antd';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import './Employees.css';

const { Title, Text } = Typography;

const employeesData = [
  { name: 'Иван Иванов', email: 'ivanov@example.com', role: 'member', signedUp: true },
  { email: 'petrov@example.com', role: 'member', signedUp: false },
  { name: 'Сергей Сергеев', email: 'sergeev@example.com', role: 'member', signedUp: true },
  { email: 'sidorov@example.com', role: 'member', signedUp: false },
];

const Employees = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [email, setEmail] = useState('');

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleOk = () => {
    message.success('Invitation link was sent!');
    setIsModalVisible(false);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  return (
    <div>
      <Title level={2}>Сотрудники</Title>
      <div className="employees-container">
        {employeesData.map((employee, index) => (
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
        ))}
      </div>
      <Button type="primary" onClick={showModal}>Invite member</Button>
      <Modal
        title="Invite member"
        visible={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        okText="Пригласить"
        cancelText="Отменить"
      >
        <Input
          placeholder="Enter email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default Employees;

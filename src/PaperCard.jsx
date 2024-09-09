import React, { useState, useEffect } from 'react';
import { Card, Progress, Button, List, Modal, InputNumber, Input, message, Select, DatePicker } from 'antd';
import { doc, updateDoc, deleteDoc, getDocs, collection } from 'firebase/firestore';
import { DeleteOutlined } from '@ant-design/icons';
import moment from 'moment';
import { db } from './components/login-signUp/firebase'; // Adjust the import path

const PaperCard = ({ paper, organizationID, fetchPaperRolls }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [clientName, setClientName] = useState('');
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [date, setDate] = useState(moment());
  const [clients, setClients] = useState([]);

  // Fetch list of clients from Firestore
  const fetchClients = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `organizations/${organizationID}/customers`));
      const clientsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setClients(clientsList);
    } catch (error) {
      message.error('Error fetching clients');
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Handle receiving new printed paper
  const handleConfirmReceive = async () => {
    if (receivedAmount > 0 && clientName) {
      const newReceivedItem = {
        client: clientName,
        amount: receivedAmount,
        date: date.format('DD MMM, YYYY'),
      };

      try {
        const updatedPaper = {
          ...paper,
          received: [...paper.received, newReceivedItem],
        };

        // Update Firestore with the received data
        const paperRef = doc(db, `organizations/${organizationID}/paper-control`, paper.id);
        await updateDoc(paperRef, {
          received: updatedPaper.received,
        });

        // Update the customer's available paper stock in Firestore
        const clientRef = doc(db, `organizations/${organizationID}/customers`, clientName);
        const clientSnapshot = await clientRef.get();
        const clientData = clientSnapshot.data();
        const updatedClientPaper = (clientData.paper?.available || 0) + receivedAmount;

        await updateDoc(clientRef, {
          'paper.available': updatedClientPaper,
        });

        setModalVisible(false);
        setReceivedAmount(0);
        setClientName('');
        setDate(moment());
        message.success('Paper received successfully');
      } catch (error) {
        message.error('Error receiving paper');
      }
    } else {
      message.error('Please select a client and specify the amount');
    }
  };

  // Handle deleting a paper roll
  const handleDeleteRoll = async () => {
    try {
      const paperRef = doc(db, `organizations/${organizationID}/paper-control`, paper.id);
      await deleteDoc(paperRef);
      message.success('Paper roll deleted successfully');
      fetchPaperRolls(); // Refresh paper rolls list after deletion
    } catch (error) {
      message.error('Error deleting paper roll');
    }
  };

  return (
    <Card
      style={{
        width: 400,
        margin: '20px auto',
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        padding: '20px',
        position: 'relative',
      }}
    >
      {/* Trash icon to delete paper roll */}
      <DeleteOutlined
        style={{
          position: 'absolute',
          right: '10px',
          top: '10px',
          cursor: 'pointer',
          color: '#ff4d4f',
        }}
        onClick={handleDeleteRoll}
      />
      <h3>Бумага №{paper.id}</h3>
      <p>Digital Print Solutions</p>
      <Progress percent={(paper.sent / paper.remaining) * 100} status="active" showInfo={false} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <p>Отправлено: {paper.sent} кг</p>
        <p>Распечатано: {paper.printed} кг</p>
        <p>Остаток: {paper.remaining} кг</p>
      </div>
      <Button type="primary" onClick={() => setModalVisible(true)}>
        Добавить приход
      </Button>

      {/* Modal for receiving paper */}
      <Modal
        title="Добавить приход"
        visible={modalVisible}
        onOk={handleConfirmReceive}
        onCancel={() => setModalVisible(false)}
      >
        <p>Выберите клиента:</p>
        <Select
          style={{ width: '100%' }}
          placeholder="Клиент"
          onChange={(value) => setClientName(value)}
        >
          {clients.map(client => (
            <Select.Option key={client.id} value={client.id}>{client.name}</Select.Option>
          ))}
        </Select>
        <p>Сколько кг вы хотите добавить?</p>
        <InputNumber
          min={1}
          value={receivedAmount}
          onChange={(value) => setReceivedAmount(value)}
        /> кг
        <p>Дата:</p>
        <DatePicker
          style={{ width: '100%' }}
          value={date}
          onChange={(value) => setDate(value)}
          defaultValue={moment()}
        />
      </Modal>

      {/* List of received items */}
      <List
        itemLayout="horizontal"
        dataSource={paper.received}
        renderItem={(item) => (
          <List.Item>
            <List.Item.Meta
              title={item.client}
              description={`${item.amount} кг - ${item.date}`}
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default PaperCard;

import React, { useState, useEffect } from 'react';
import { Card, Progress, Button, List, Modal, InputNumber, Select, DatePicker, message } from 'antd';
import { doc, updateDoc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'; 
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { db } from './components/login-signUp/firebase';
import moment from 'moment';

const PaperCard = ({ paper, organizationID, fetchPaperRolls }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [clientName, setClientName] = useState('');
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [date, setDate] = useState(moment());
  const [clients, setClients] = useState([]);

  // Fetch list of clients from Firestore using organizationID
  const fetchClients = async () => {
    try {
      if (organizationID) {
        const querySnapshot = await getDocs(collection(db, `organizations/${organizationID}/customers`));
        const clientsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setClients(clientsList);
      } else {
        message.error('Отсутствует ID организации.');
      }
    } catch (error) {
      console.error('Ошибка при получении данных клиентов:', error);
      message.error('Ошибка при получении данных клиентов.');
    }
  };

  useEffect(() => {
    fetchClients();
  }, [organizationID]);

  // Handle receiving new printed paper
  const handleConfirmReceive = async () => {
    if (receivedAmount > 0 && clientName) {
      try {
        // Extract the roll ID from the `paper.id`. Split by `-` and take the first part (actual roll ID).
        const [rollId] = paper.id.split('-'); // This will extract only the document ID part
  
        // Now, use the extracted roll ID to fetch the correct document from Firestore
        const paperRef = doc(db, `organizations/${organizationID}/paper-control`, rollId);
  
        console.log('Fetching document from Firestore using roll ID:', rollId);
        console.log('Document reference path:', paperRef.path);
  
        let paperSnapshot;
        try {
          paperSnapshot = await getDoc(paperRef);
        } catch (error) {
          message.error('Ошибка при получении документа из Firestore.');
          console.error('Error fetching document:', error);
          return;
        }
  
        // Check if the document exists
        if (!paperSnapshot.exists()) {
          message.error('Рулон бумаги не существует.');
          console.error('Document not found with Firestore ID:', rollId);
          return;
        }
  
        // Create a new received item
        const newReceivedItem = {
          client: clientName,
          amount: receivedAmount,
          date: date.format('DD MMM, YYYY'),
        };
  
        // Get the current data for the paper
        const paperData = paperSnapshot.data();
  
        // Update the paper document's `received` array and `remaining` field
        const updatedPaper = {
          ...paperData,
          received: [...(paperData.received || []), newReceivedItem],
          remaining: paperData.remaining - receivedAmount,
        };
  
        await updateDoc(paperRef, {
          received: updatedPaper.received,
          remaining: updatedPaper.remaining,
        });
  
        // Update customer's available paper stock
        const clientRef = doc(db, `organizations/${organizationID}/customers`, clientName);
        const clientSnapshot = await getDoc(clientRef);
        const clientData = clientSnapshot.data();
        const updatedClientPaper = (clientData.paper?.available || 0) + receivedAmount;
  
        await updateDoc(clientRef, {
          'paper.available': updatedClientPaper,
        });
  
        setModalVisible(false);
        setReceivedAmount(0);
        setClientName('');
        setDate(moment());
        message.success('Бумага успешно принята.');
        fetchPaperRolls();
      } catch (error) {
        message.error('Ошибка при приеме бумаги.');
        console.error('Error details:', error);
      }
    } else {
      message.error('Выберите клиента и укажите количество.');
    }
  };
  
  
  // Handle deleting a paper roll
  const handleDeleteRoll = async () => {
    try {
      const paperRef = doc(db, `organizations/${organizationID}/paper-control`, paper.id);
      await deleteDoc(paperRef);
      message.success('Рулон бумаги успешно удален.');
      fetchPaperRolls();
    } catch (error) {
      message.error('Ошибка при удалении рулона бумаги.');
    }
  };

  return (
    <Card
      style={{
        width: 400,
        margin: '20px auto',
        border: '1px solid #e8e8e8',
        borderRadius: '8px',
        padding: '20px',
        position: 'relative',
      }}
    >
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

      <Progress
        percent={(paper.sent / paper.total) * 100}
        status="active"
        showInfo={false}
        strokeColor="#1890ff"
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <p>Отправлено: {paper.sent} кг</p>
        <p>Распечатано: {(paper.received || []).reduce((sum, item) => sum + item.amount, 0)} кг</p>
        <p>Остаток: {paper.remaining} кг</p>
      </div>

      <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
        Добавить приход
      </Button>

      <Modal
        title="Добавить приход"
        visible={modalVisible}
        onOk={handleConfirmReceive}
        onCancel={() => setModalVisible(false)}
      >
        <p>Выберите клиента:</p>
        <Select
          placeholder="Выберите клиента"
          style={{ width: '100%' }}
          onChange={(value) => setClientName(value)}
        >
          {clients.map(client => (
            <Select.Option key={client.id} value={client.id}>
              {client.brand}
            </Select.Option>
          ))}
        </Select>

        <p>Сколько кг вы хотите добавить?</p>
        <InputNumber
          min={1}
          value={receivedAmount}
          onChange={(value) => setReceivedAmount(value)}
          placeholder="Введите количество (кг)"
          style={{ width: '100%' }}
        /> кг

        <p>Дата:</p>
        <DatePicker
          style={{ width: '100%' }}
          value={date}
          onChange={(value) => setDate(value)}
          defaultValue={moment()}
        />
      </Modal>

      <List
        itemLayout="horizontal"
        dataSource={paper.received || []}
        renderItem={item => (
          <List.Item>
            <List.Item.Meta
              title={`Клиент: ${item.client}`}
              description={`Получено: ${item.amount} кг, Дата: ${item.date}`}
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default PaperCard;

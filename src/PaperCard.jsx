import React, { useState, useEffect } from 'react';
import { Card, Progress, Button, List, Modal, InputNumber, Select, DatePicker, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { doc, updateDoc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './components/login-signUp/firebase';
import moment from 'moment';

const PaperCard = ({ paper, organizationID, fetchPaperRolls, index }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [clientName, setClientName] = useState('');
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [date, setDate] = useState(moment());
  const [clients, setClients] = useState([]);
  const [agencyName, setAgencyName] = useState(''); // Fetch the dynamic agency name

  // Fetch agency name from Firestore using agencyID
  useEffect(() => {
    const fetchAgencyName = async () => {
      try {
        const agencyRef = doc(db, `organizations/${organizationID}/agencies`, paper.agencyID);
        const agencySnap = await getDoc(agencyRef);
        setAgencyName(agencySnap.data()?.name || 'Агентство неизвестно');
      } catch (error) {
        console.error('Ошибка при получении данных агентства:', error);
      }
    };

    fetchAgencyName();
  }, [organizationID, paper.agencyID]);

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
        const [rollId] = paper.id.split('-');
        const paperRef = doc(db, `organizations/${organizationID}/paper-control`, rollId);

        const paperSnapshot = await getDoc(paperRef);
        if (!paperSnapshot.exists()) {
          message.error('Рулон бумаги не существует.');
          return;
        }

        const newReceivedItem = {
          client: clientName,
          amount: receivedAmount,
          date: date.format('DD MMM, YYYY'),
        };

        const paperData = paperSnapshot.data();
        const updatedPaper = {
          ...paperData,
          received: [...(paperData.received || []), newReceivedItem],
          remaining: paperData.remaining - receivedAmount,
        };

        await updateDoc(paperRef, {
          received: updatedPaper.received,
          remaining: updatedPaper.remaining,
        });

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
      }
    } else {
      message.error('Выберите клиента и укажите количество.');
    }
  };

  // Handle deleting a paper roll
  const handleDeleteRoll = async () => {
    try {
      const [rollId] = paper.id.split('-');
      const paperRef = doc(db, `organizations/${organizationID}/paper-control`, rollId);
      await deleteDoc(paperRef);
      message.success('Рулон бумаги успешно удален.');
      fetchPaperRolls();
    } catch (error) {
      message.error('Ошибка при удалении рулона бумаги.');
    }
  };

  // Render paper transactions (received history)
  const renderTransactions = () => (
    <List
      itemLayout="horizontal"
      dataSource={paper.received || []}
      renderItem={item => (
        <List.Item>
          <List.Item.Meta
            title={`${item.client}`}
            description={`${item.amount} кг — ${item.date}`}
          />
        </List.Item>
      )}
    />
  );

  return (
    <Card
      style={{
        width: 500,
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

      {/* Title with sequence order */}
      <h3>{`Бумага №${String(index).padStart(3, '0')}`}</h3>

      {/* Dynamic Agency Name */}
      <p>{agencyName}</p>
      <p>{moment(paper.date).format('YYYY.MM.DD')}</p>

      {/* Progress bar */}
      <Progress
        percent={((paper.sent - paper.remaining) / paper.sent) * 100}
        status="active"
        showInfo={false}
        strokeColor="#1890ff"
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <p>Отправлено: {paper.sent} кг</p>
        <p>Распечатано: {(paper.received || []).reduce((sum, item) => sum + item.amount, 0)} кг</p>
        <p>Остаток: {paper.remaining} кг</p>
      </div>

      {/* Add "Добавить приход" button */}
      <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
        Добавить приход
      </Button>

      {/* Transactions (received history) */}
      {renderTransactions()}

      {/* Modal for adding a transaction */}
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
    </Card>
  );
};

export default PaperCard;


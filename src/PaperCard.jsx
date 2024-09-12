
import React, { useState, useEffect } from 'react';
import { Card, Progress, Button, Modal, InputNumber, Select, DatePicker, message, List } from 'antd';
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './components/login-signUp/firebase';
import moment from 'moment';

const PaperCard = ({ paper, organizationID, fetchPaperRolls, index }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [clientName, setClientName] = useState('');
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [date, setDate] = useState(moment());
  const [clients, setClients] = useState([]);
  const [agencyName, setAgencyName] = useState('');
  const [selectedPaperCard, setSelectedPaperCard] = useState(null);

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

  // Handle receiving printed paper from agency
  const handleClientReceivePaper = async () => {
    if (!receivedAmount || !clientName || !selectedPaperCard) {
      message.error('Заполните все поля.');
      return;
    }

    try {
      const paperRef = doc(db, `organizations/${organizationID}/paper-control`, paper.id);
      const updatedPaperCards = paper.paperCards.map((card) => {
        if (card.id === selectedPaperCard.id) {
          const updatedTotalPrinted = card.total_printed + receivedAmount;
          const updatedRemaining = card.total_remaining - receivedAmount;
          const updatedTransactions = [...card.transactions, {
            clientID: clientName,
            amount_printed: receivedAmount,
            date_printed: date.format('YYYY-MM-DD'),
          }];
          return {
            ...card,
            total_printed: updatedTotalPrinted,
            total_remaining: updatedRemaining,
            transactions: updatedTransactions,
          };
        }
        return card;
      });

      // Update paper document with the new paperCard details
      await updateDoc(paperRef, { paperCards: updatedPaperCards });

      // Update customer's paper availability record (assuming it is tracked separately)
      const clientRef = doc(db, `organizations/${organizationID}/customers`, clientName);
      const clientSnap = await getDoc(clientRef);
      const clientData = clientSnap.data();
      const updatedClientRemaining = clientData.remainingPaper ? clientData.remainingPaper + receivedAmount : receivedAmount;
      await updateDoc(clientRef, { remainingPaper: updatedClientRemaining });

      message.success('Бумага успешно получена от агентства.');
      fetchPaperRolls(); // Refresh the data
    } catch (error) {
      console.error('Ошибка при получении бумаги от агентства:', error);
      message.error('Ошибка при получении бумаги от агентства.');
    }

    setModalVisible(false);
    setReceivedAmount(0);
    setClientName('');
  };

  return (
    <Card title={`Агентство: ${agencyName}`} key={index}>
      <Progress percent={(paper.total_used / paper.total) * 100} status="active" />
      <p>Осталось: {paper.remaining} кг, Использовано: {paper.used} кг, Всего: {paper.total} кг</p>
      
      <Button onClick={() => { setModalVisible(true); fetchClients(); }}>Добавить приход</Button>
      
      {/* Display the transaction details in the card */}
      <List
        header="Транзакции:"
        bordered
        dataSource={paper.transactions || []}
        renderItem={(transaction) => (
          <List.Item key={transaction.date_printed}>
            {`Клиент: ${transaction.clientID}, Напечатано: ${transaction.amount_printed} кг, Дата: ${transaction.date_printed}`}
          </List.Item>
        )}
      />

      {/* Modal for receiving printed paper from agency */}
      <Modal
        title="Получить напечатанную бумагу"
        visible={modalVisible}
        onOk={handleClientReceivePaper}
        onCancel={() => setModalVisible(false)}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="Выберите клиента"
          onChange={(value) => setClientName(value)}
        >
          {clients.map(client => (
            <Select.Option key={client.id} value={client.id}>{client.name}</Select.Option>
          ))}
        </Select>
        <br /><br />
        <InputNumber
          min={1}
          max={selectedPaperCard ? selectedPaperCard.total_remaining : 0}
          value={receivedAmount}
          onChange={(value) => setReceivedAmount(value)}
          placeholder="Введите количество (кг)"
          style={{ width: '100%' }}
        /> кг
        <br /><br />
        <DatePicker
          style={{ width: '100%' }}
          value={date}
          onChange={(value) => setDate(value)}
          format="YYYY-MM-DD"
        />
      </Modal>
    </Card>
  );
};

export default PaperCard;
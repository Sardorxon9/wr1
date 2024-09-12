
import React, { useState, useEffect } from 'react';
import { Card, Progress, Button, Modal, InputNumber, Select, Input, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { doc, updateDoc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from './components/login-signUp/firebase';
import moment from 'moment';

const Test = ({ organizationID }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [rollName, setRollName] = useState('');
  const [rollWeight, setRollWeight] = useState(0);
  const [paperRolls, setPaperRolls] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [selectedRoll, setSelectedRoll] = useState(null);
  const [sendAmount, setSendAmount] = useState(0);
  const [agencyID, setAgencyID] = useState('');
  const [createAgencyModalVisible, setCreateAgencyModalVisible] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');

  // Fetch paper rolls (local function)
  const fetchPaperRolls = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `organizations/${organizationID}/paper-control`));
      const paperList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPaperRolls(paperList);
    } catch (error) {
      console.error('Ошибка при получении данных рулонов бумаги:', error);
    }
  };

  // UseEffect to initially load the paper rolls when component mounts
  useEffect(() => {
    fetchPaperRolls();
  }, [organizationID]);

  // Fetch agencies for selection
  const fetchAgencies = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `organizations/${organizationID}/agencies`));
      const agenciesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgencies(agenciesList);
    } catch (error) {
      console.error('Ошибка при получении данных агентств:', error);
      message.error('Ошибка при получении данных агентств.');
    }
  };

  // Create a new paper roll
  const handleCreateRoll = async () => {
    if (!rollName || rollWeight <= 0) {
      message.error('Введите валидное имя рулона и вес.');
      return;
    }
    try {
      const newRollRef = doc(collection(db, `organizations/${organizationID}/paper-control`));
      await setDoc(newRollRef, {
        name: rollName,
        remaining: rollWeight,
        used: 0,
        total: rollWeight,
        date_registered: moment().format('YYYY-MM-DD'),
        paperCards: [],
      });
      message.success('Новый рулон создан успешно.');
      setRollName('');
      setRollWeight(0);
      fetchPaperRolls(); // Refresh the list
    } catch (error) {
      console.error('Ошибка при создании рулона:', error);
      message.error('Ошибка при создании рулона.');
    }
    setModalVisible(false);
  };

  // Handle assigning paper to an agency
  const handleAssignToAgency = async () => {
    if (!selectedRoll || sendAmount <= 0 || !agencyID) {
      message.error('Выберите агентство и валидное количество.');
      return;
    }

    try {
      // Update the paper roll's remaining and used
      const paperRef = doc(db, `organizations/${organizationID}/paper-control`, selectedRoll.id);
      const updatedRemaining = selectedRoll.remaining - sendAmount;
      const updatedUsed = selectedRoll.used + sendAmount;
      await updateDoc(paperRef, {
        remaining: updatedRemaining,
        used: updatedUsed,
        paperCards: [...selectedRoll.paperCards, {
          agencyID,
          id: Date.now(), // Unique ID for this card
          total_given: sendAmount,
          total_printed: 0,
          total_remaining: sendAmount,
          transactions: [],
          date_given: moment().format('YYYY-MM-DD'),
        }]
      });

      message.success('Бумага успешно выведена агентству.');
      fetchPaperRolls(); // Refresh the list after assigning paper
    } catch (error) {
      console.error('Ошибка при выводе бумаги в агентство:', error);
      message.error('Ошибка при выводе бумаги.');
    }

    setSelectedRoll(null);
    setSendAmount(0);
    setAgencyID('');
  };

  // Create a new agency
  const handleCreateAgency = async () => {
    if (!newAgencyName) {
      message.error('Введите название агентства.');
      return;
    }
    try {
      const newAgencyRef = doc(collection(db, `organizations/${organizationID}/agencies`));
      await setDoc(newAgencyRef, { name: newAgencyName });
      message.success('Новое агентство создано успешно.');
      fetchAgencies(); // Refresh agencies list
    } catch (error) {
      console.error('Ошибка при создании агентства:', error);
      message.error('Ошибка при создании агентства.');
    }
    setNewAgencyName('');
    setCreateAgencyModalVisible(false);
  };

  return (
    <div>
      <Button onClick={() => setModalVisible(true)} type="primary" icon={<PlusOutlined />}>Создать новый рулон бумаги</Button>
      <Button onClick={() => setCreateAgencyModalVisible(true)} type="default" style={{ marginLeft: '10px' }}>Создать агентство</Button>

      <div style={{ marginTop: '20px' }}>
        {paperRolls.map(roll => (
          <Card key={roll.id} title={roll.name}>
            <Progress percent={(roll.used / roll.total) * 100} status="active" />
            <p>Осталось: {roll.remaining} кг, Использовано: {roll.used} кг, Всего: {roll.total} кг</p>
            <Button onClick={() => { setSelectedRoll(roll); fetchAgencies(); setModalVisible(true); }}>Вывести в агентство</Button>
          </Card>
        ))}
      </div>

      {/* Modal for creating new paper roll */}
      <Modal
        title="Создать новый рулон бумаги"
        visible={modalVisible}
        onOk={handleCreateRoll}
        onCancel={() => setModalVisible(false)}
      >
        <Input
          placeholder="Название рулона"
          value={rollName}
          onChange={(e) => setRollName(e.target.value)}
          style={{ marginBottom: '10px' }}
        />
        <InputNumber
          min={1}
          value={rollWeight}
          onChange={(value) => setRollWeight(value)}
          placeholder="Вес рулона (кг)"
          style={{ width: '100%' }}
        /> кг
      </Modal>

      {/* Modal for assigning paper to an agency */}
      <Modal
        title="Вывести бумагу в агентство"
        visible={selectedRoll && modalVisible}
        onOk={handleAssignToAgency}
        onCancel={() => setModalVisible(false)}
      >
        <InputNumber
          min={1}
          max={selectedRoll ? selectedRoll.remaining : 0}
          value={sendAmount}
          onChange={(value) => setSendAmount(value)}
          placeholder="Введите количество (кг)"
          style={{ width: '100%' }}
        /> кг
        <br /><br />
        <Select
          style={{ width: '100%' }}
          placeholder="Выберите агентство"
          onChange={(value) => setAgencyID(value)}
        >
          {agencies.map(agency => (
            <Select.Option key={agency.id} value={agency.id}>{agency.name}</Select.Option>
          ))}
        </Select>
      </Modal>

      {/* Modal for creating new agency */}
      <Modal
        title="Зарегистрировать агентство"
        visible={createAgencyModalVisible}
        onOk={handleCreateAgency}
        onCancel={() => setCreateAgencyModalVisible(false)}
      >
        <Input
          placeholder="Название агентства"
          value={newAgencyName}
          onChange={(e) => setNewAgencyName(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default Test;
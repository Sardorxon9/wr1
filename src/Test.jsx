import React, { useState, useEffect } from 'react';
import { Button, Card, Modal, Progress, InputNumber, Input, message, Select, Empty } from 'antd';
import { collection, doc, addDoc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';
import { db } from './components/login-signUp/firebase';
import PaperCard from './PaperCard';

const Test = () => {
  const [rolls, setRolls] = useState([]);
  const [selectedRoll, setSelectedRoll] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sendAmount, setSendAmount] = useState(0);
  const [agencyID, setAgencyID] = useState('');
  const [createAgencyModalVisible, setCreateAgencyModalVisible] = useState(false);
  const [createRollModalVisible, setCreateRollModalVisible] = useState(false); // Modal for creating a new roll
  const [newAgencyName, setNewAgencyName] = useState('');
  const [agencies, setAgencies] = useState([]);
  const [newRollName, setNewRollName] = useState(''); // New paper roll name
  const [newRollWeight, setNewRollWeight] = useState(0); // New paper roll weight

  const { organizationID } = useOutletContext(); // Access the organizationID

  // Fetch paper rolls and agencies when the component mounts or organizationID changes
// Fetch paper rolls and ensure you use Firestore-generated doc.id
useEffect(() => {
  const fetchData = async () => {
    if (organizationID) {
      try {
        const paperRollsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/paper-control`));
        const paperRollsData = paperRollsSnapshot.docs.map(doc => ({
          id: doc.id,  // Use Firestore's doc.id as the document identifier
          ...doc.data()
        }));
        setRolls(paperRollsData);

        const agenciesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/agencies`));
        const agenciesData = agenciesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAgencies(agenciesData);
      } catch (error) {
        message.error('Ошибка при загрузке данных: ' + error.message);
      }
    }
  };

  fetchData();
}, [organizationID]);


  // Handle assigning unprinted paper to an agency and creating a new paper card
  const handleAssignToAgency = async () => {
    if (sendAmount > 0 && selectedRoll && agencyID) {
      try {
        const newPaperCardID = `${selectedRoll.id}-${agencyID}-${Date.now()}`;
        const updatedPaperCards = selectedRoll.paperCards ? [...selectedRoll.paperCards] : [];
  
        const newPaperCard = {
          id: newPaperCardID,
          agencyID,
          sent: sendAmount,
          printed: 0,
          remaining: sendAmount,
          received: [],
        };
  
        updatedPaperCards.push(newPaperCard);
  
        // Update Firestore with the new paper card and roll information
        const rollRef = doc(db, `organizations/${organizationID}/paper-control`, selectedRoll.id);
        await updateDoc(rollRef, {
          remaining: selectedRoll.remaining - sendAmount,
          paperCards: updatedPaperCards,  // Update paper cards array with the new paper card
        });
  
        // Update state after successful Firestore update
        const updatedRolls = rolls.map((roll) =>
          roll.id === selectedRoll.id
            ? {
                ...roll,
                remaining: roll.remaining - sendAmount,
                paperCards: updatedPaperCards,
              }
            : roll
        );
  
        setRolls(updatedRolls);
        setModalVisible(false);
        setSendAmount(0);
        message.success('Бумага успешно назначена агентству.');
      } catch (error) {
        message.error('Ошибка при назначении бумаги.');
        console.error('Assignment error:', error);
      }
    } else {
      message.error('Пожалуйста, выберите агентство и укажите количество.');
    }
  };
  
  

  // Handle creating a new printing agency
  const handleCreateAgency = async () => {
    if (newAgencyName) {
      try {
        await addDoc(collection(db, `organizations/${organizationID}/agencies`), {
          name: newAgencyName,
        });
        setCreateAgencyModalVisible(false);
        setNewAgencyName('');
        message.success('Агентство успешно создано.');
        const agenciesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/agencies`));
        const agenciesData = agenciesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAgencies(agenciesData);
      } catch (error) {
        message.error('Ошибка при создании агентства.');
      }
    } else {
      message.error('Введите название агентства.');
    }
  };

  // Handle creating a new paper roll
// Handle creating a new paper roll
const handleCreateRoll = async () => {
  if (newRollName && newRollWeight > 0) {
    try {
      // Create a new unprinted paper roll in the Firestore collection
      await addDoc(collection(db, `organizations/${organizationID}/paper-control`), {
        name: newRollName,
        total: newRollWeight,
        used: 0,
        remaining: newRollWeight,
        paperCards: [], // Initialize paper cards as an empty array
      });
      setCreateRollModalVisible(false);
      setNewRollName('');
      setNewRollWeight(0);
      message.success('Новый рулон бумаги успешно создан.');
      // Fetch the updated list of rolls
      const paperRollsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/paper-control`));
      const paperRollsData = paperRollsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRolls(paperRollsData);
    } catch (error) {
      message.error('Ошибка при создании рулона бумаги.');
    }
  } else {
    message.error('Введите название и вес рулона бумаги.');
  }
};


  return (
    <div>
      {/* Button to create a new printing agency */}
      <Button type="primary" onClick={() => setCreateAgencyModalVisible(true)} style={{ marginBottom: 20 }}>
        Зарегистрировать агентство
      </Button>

      {/* Button to create a new paper roll */}
      <Button type="primary" onClick={() => setCreateRollModalVisible(true)} style={{ marginBottom: 20 }}>
        Зарегистрировать новый рулон бумаги
      </Button>

      {/* Render unprinted paper roll cards as tabs */}
      {rolls.length === 0 ? (
        <Empty description="Рулоны бумаги отсутствуют" />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          {rolls.map((roll) => (
            <Card
              key={roll.id}
              style={{
                width: 250,
                border: '1px solid #e8e8e8',
                padding: 20,
                textAlign: 'center',
                borderColor: selectedRoll && selectedRoll.id === roll.id ? '#1890ff' : '#e8e8e8',
              }}
              onClick={() => setSelectedRoll(roll)}
            >
              <h3>{roll.name}</h3>
              <Progress percent={(roll.used / roll.total) * 100} status="active" showInfo={false} />
              <p>Использовано: {roll.used} кг</p>
              <p>Остаток: {roll.remaining} кг</p>
              <Button onClick={() => setModalVisible(true)}>Вывести</Button>
            </Card>
          ))}
        </div>
      )}

      {/* Render PaperCards for the selected roll */}
      {selectedRoll && selectedRoll.paperCards && (
        <div style={{ marginTop: 40 }}>
          {selectedRoll.paperCards.map((paper, index) => (
            <PaperCard
              key={index}
              paper={paper}
              organizationID={organizationID}
              fetchPaperRolls={() => setSelectedRoll(null)} // Reset selected roll after operation
            />
          ))}
        </div>
      )}

      {/* Modal for assigning paper to an agency */}
      <Modal
        title="Вывести бумагу в агентство"
        visible={modalVisible}
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

      {/* Modal for creating a new printing agency */}
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

      {/* Modal for creating a new paper roll */}
      <Modal
        title="Зарегистрировать новый рулон бумаги"
        visible={createRollModalVisible}
        onOk={handleCreateRoll}
        onCancel={() => setCreateRollModalVisible(false)}
      >
        <Input
          placeholder="Название рулона"
          value={newRollName}
          onChange={(e) => setNewRollName(e.target.value)}
          style={{ marginBottom: '10px' }}
        />
        <InputNumber
          min={1}
          value={newRollWeight}
          onChange={(value) => setNewRollWeight(value)}
          placeholder="Вес рулона (кг)"
          style={{ width: '100%' }}
        /> кг
      </Modal>
    </div>
  );
};

export default Test;


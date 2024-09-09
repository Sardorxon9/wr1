import React, { useState, useEffect } from 'react';
import { Button, Card, Modal, Progress, InputNumber, message,Input, Select, Empty } from 'antd';
import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { DeleteOutlined } from '@ant-design/icons';
import { db } from './components/login-signUp/firebase'; // Adjust the import path
import PaperCard from './PaperCard';

const Test = ({ organizationID }) => {
  const [rolls, setRolls] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [selectedRoll, setSelectedRoll] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [sendAmount, setSendAmount] = useState(0);
  const [agencyID, setAgencyID] = useState('');
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newRollWeight, setNewRollWeight] = useState(0);
  const [newRollName, setNewRollName] = useState('');
  const [createAgencyModalVisible, setCreateAgencyModalVisible] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');

  // Fetch paper rolls for the organization
  const fetchPaperRolls = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `organizations/${organizationID}/paper-control`));
      const paperRolls = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        paperCards: doc.data().paperCards || [], // Ensure paperCards is an array
      }));
      setRolls(paperRolls);
    } catch (error) {
      message.error('Error fetching paper rolls');
    }
  };

  // Fetch existing agencies
  const fetchAgencies = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, `organizations/${organizationID}/agencies`));
      const agencyList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgencies(agencyList);
    } catch (error) {
      message.error('Error fetching agencies');
    }
  };

  useEffect(() => {
    fetchPaperRolls();
    fetchAgencies();
  }, [organizationID]);

  // Handle creating a new paper roll
  const handleCreateRoll = async () => {
    if (newRollWeight > 0 && newRollName) {
      try {
        const newRoll = {
          name: newRollName,
          total: newRollWeight,
          used: 0,
          remaining: newRollWeight,
          paperCards: [],
        };
  
        // Use organizationID in the path
        if (!organizationID) {
          console.error('Organization ID is missing or undefined');
          message.error('Organization ID is missing');
          return;
        }
  
        await addDoc(collection(db, `organizations/${organizationID}/paper-control`), newRoll);
  
        fetchPaperRolls();
        setCreateModalVisible(false);
        setNewRollWeight(0);
        setNewRollName('');
        message.success('New paper roll created successfully');
      } catch (error) {
        message.error('Error creating paper roll');
      }
    } else {
      message.error('Please provide a valid roll name and weight');
    }
  };
  

  // Handle creating a new printing agency
  const handleCreateAgency = async () => {
    if (newAgencyName) {
      try {
        const newAgency = {
          name: newAgencyName,
        };

        await addDoc(collection(db, `organizations/${organizationID}/agencies`), newAgency);

        // Refetch agencies after creating a new one
        fetchAgencies();

        setCreateAgencyModalVisible(false);
        setNewAgencyName('');
        message.success('New printing agency created successfully');
      } catch (error) {
        message.error('Error creating printing agency');
      }
    } else {
      message.error('Please provide a valid agency name');
    }
  };

  // Confirm the paper assignment to an agency
  const handleConfirmSend = async () => {
    if (sendAmount > 0 && selectedRoll && agencyID) {
      try {
        const newRemaining = selectedRoll.remaining - sendAmount;
        const newPaperCard = {
          id: selectedRoll.id + '-' + (selectedRoll.paperCards.length + 1),
          agencyID,
          sent: sendAmount,
          printed: 0,
          remaining: sendAmount,
          received: [],
        };

        const updatedRolls = rolls.map((roll) =>
          roll.id === selectedRoll.id
            ? {
                ...roll,
                remaining: newRemaining,
                used: roll.total - newRemaining,
                paperCards: [...roll.paperCards, newPaperCard],
              }
            : roll
        );

        // Update Firestore with the new data
        const rollRef = doc(db, `organizations/${organizationID}/paper-control`, selectedRoll.id);
        await updateDoc(rollRef, {
          remaining: newRemaining,
          used: selectedRoll.total - newRemaining,
          paperCards: updatedRolls.find(roll => roll.id === selectedRoll.id).paperCards,
        });

        setRolls(updatedRolls);
        setModalVisible(false);
        setSendAmount(0);
        message.success('Paper assigned to the agency successfully');
      } catch (error) {
        message.error('Error assigning paper');
      }
    } else {
      message.error('Please select an agency and specify the amount');
    }
  };

  // Handle deleting a paper roll
  const handleDeleteRoll = async (rollId) => {
    try {
      const rollRef = doc(db, `organizations/${organizationID}/paper-control`, rollId);
      await deleteDoc(rollRef);
      message.success('Paper roll deleted successfully');
      fetchPaperRolls(); // Refresh paper rolls list after deletion
    } catch (error) {
      message.error('Error deleting paper roll');
    }
  };

  return (
    <div>
      {/* Button to create a new paper roll */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <Button type="primary" onClick={() => setCreateModalVisible(true)}>
          Создать новый рулон бумаги
        </Button>
        {/* Button to create a new printing agency */}
        <Button type="primary" onClick={() => setCreateAgencyModalVisible(true)} style={{ marginLeft: 10 }}>
          Зарегистрировать агентство
        </Button>
      </div>

      {/* Render the paper roll tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
        {rolls.length > 0 ? (
          rolls.map((roll) => (
            <Card
              key={roll.id}
              style={{ width: 250, border: '1px solid #e8e8e8', padding: 20, textAlign: 'center', position: 'relative' }}
              onClick={() => setSelectedRoll(roll)}
            >
              {/* Trash icon for deleting paper roll */}
              <DeleteOutlined
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '10px',
                  cursor: 'pointer',
                  color: '#ff4d4f',
                }}
                onClick={(e) => {
                  e.stopPropagation(); // Prevent triggering card click event
                  handleDeleteRoll(roll.id);
                }}
              />
              <h3>{roll.name || `Бумага №${roll.id}`}</h3>
              <p>без печати</p>
              <Progress percent={(roll.used / roll.total) * 100} status="active" showInfo={false} />
              <p>Использовано: {roll.used} кг</p>
              <p>Остаток: {roll.remaining} кг</p>
              <Button type="default" onClick={() => setModalVisible(true)}>
                Вывести
              </Button>
            </Card>
          ))
        ) : (
          <Empty description="No Paper Rolls Available" />
        )}
      </div>

      {/* Render paper cards for the selected roll */}
      {selectedRoll && (
        <div style={{ marginTop: 40 }}>
          {selectedRoll.paperCards.length > 0 ? (
            selectedRoll.paperCards.map((paper) => (
              <PaperCard
                key={paper.id}
                paper={paper}
                organizationID={organizationID}
                fetchPaperRolls={fetchPaperRolls}
              />
            ))
          ) : (
            <Empty description="No Paper Cards for This Roll" />
          )}
        </div>
      )}

      {/* Modal for creating a new paper roll */}
      <Modal
        title="Создать новый рулон бумаги"
        visible={createModalVisible}
        onOk={handleCreateRoll}
        onCancel={() => setCreateModalVisible(false)}
      >
        <p>Введите название рулона:</p>
        <Input
          placeholder="Название рулона"
          value={newRollName}
          onChange={(e) => setNewRollName(e.target.value)}
        />
        <br /><br />
        <p>Введите вес рулона (в кг):</p>
        <InputNumber
          min={1}
          value={newRollWeight}
          onChange={(value) => setNewRollWeight(value)}
          placeholder="Вес рулона (кг)"
          style={{ width: '100%' }}
        />
      </Modal>

      {/* Modal for creating a new printing agency */}
      <Modal
        title="Зарегистрировать агентство"
        visible={createAgencyModalVisible}
        onOk={handleCreateAgency}
        onCancel={() => setCreateAgencyModalVisible(false)}
      >
        <p>Введите название агентства:</p>
        <Input
          placeholder="Название агентства"
          value={newAgencyName}
          onChange={(e) => setNewAgencyName(e.target.value)}
        />
      </Modal>

      {/* Modal for assigning paper to an agency */}
      <Modal
        title="Сколько кг вы хотите вывести?"
        visible={modalVisible}
        onOk={handleConfirmSend}
        onCancel={() => setModalVisible(false)}
      >
        <InputNumber
          min={1}
          max={selectedRoll ? selectedRoll.remaining : 0}
          value={sendAmount}
          onChange={(value) => setSendAmount(value)}
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
    </div>
  );
};

export default Test;

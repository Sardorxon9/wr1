import React, { useState, useEffect } from 'react';
import { Button, Card, Modal, Progress, InputNumber,Input, message, Select, Empty } from 'antd';
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
  const [createRollModalVisible, setCreateRollModalVisible] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');
  const [agencies, setAgencies] = useState([]);
  const [newRollName, setNewRollName] = useState('');
  const [newRollWeight, setNewRollWeight] = useState(0);

  const { organizationID } = useOutletContext(); // Access the organizationID

  // Fetch paper rolls and agencies when the component mounts or organizationID changes
  useEffect(() => {
    const fetchData = async () => {
      if (organizationID) {
        try {
          const paperRollsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/paper-control`));
          const paperRollsData = paperRollsSnapshot.docs.map(doc => ({
            id: doc.id,  // Ensure Firestore's doc.id is captured
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

  // Handle assigning unprinted paper to an agency
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

        const rollRef = doc(db, `organizations/${organizationID}/paper-control`, selectedRoll.id);

        const rollSnapshot = await getDoc(rollRef);

        if (!rollSnapshot.exists()) {
          message.error('Рулон бумаги не существует.');
          return;
        }

        await updateDoc(rollRef, {
          remaining: selectedRoll.remaining - sendAmount,
          paperCards: updatedPaperCards,
        });

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
  const handleCreateRoll = async () => {
    if (newRollName && newRollWeight > 0) {
      try {
        await addDoc(collection(db, `organizations/${organizationID}/paper-control`), {
          name: newRollName,
          total: newRollWeight,
          used: 0,
          remaining: newRollWeight,
          paperCards: [],
        });
        setCreateRollModalVisible(false);
        setNewRollName('');
        setNewRollWeight(0);
        message.success('Новый рулон бумаги успешно создан.');
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
      <Button type="primary" ghost onClick={() => setCreateAgencyModalVisible(true)} style={{ marginBottom: 20, marginRight : 8, }}>
        Зарегистрировать агентство
      </Button>

      <Button type="primary"  onClick={() => setCreateRollModalVisible(true)} style={{ marginBottom: 20 }}>
        Зарегистрировать новый рулон бумаги
      </Button>

      {rolls.length === 0 ? (
        <Empty description="Рулоны бумаги отсутствуют" />
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
          {rolls.map((roll) => (
            <Card
              key={roll.id}
              style={{
                width: 350,
                border: '1px solid #e8e8e8',
                padding: 20,
                textAlign: 'center',
                boxShadow: selectedRoll && selectedRoll.id === roll.id ? '0px 4px 12px rgba(0, 0, 0, 0.2)' : '0px 2px 8px rgba(0, 0, 0, 0.1)', // Shadow effect
                borderColor: selectedRoll && selectedRoll.id === roll.id ? '#1890ff' : '#e8e8e8',
              }}
              onClick={() => setSelectedRoll(roll)}
            >
              <h3>{roll.name}</h3>
              <h4 style={{ fontWeight: '300' }}>Рулон : без печати</h4>

              {/* Progress bar showing how much of the roll has been used */}
              <Progress
  percent={((roll.total - roll.remaining) / roll.total) * 100} // This line is still used to determine the width of the progress bar, based on the amount used
  status="active"
  strokeColor="#1890ff"
  format={() => `${roll.total - roll.remaining} кг / ${roll.total} кг`} // Display KG instead of percentage
/>

              <div style={{width:"100%", display: 'flex', justifyContent: 'space-between' }}>
                <p>Использовано: {roll.total - roll.remaining} кг</p>
                <p style={{ color: '#1890ff', paddingLeft:"10%", display: 'flex', alignItems: 'center' }}>
                  {/* Blue dot before "Остаток" */}
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#1890ff',
                      borderRadius: '50%',
                      display: 'inline-block',
                      marginRight: '5px',
                    }}
                  />
                  Остаток: {roll.remaining} кг
                </p>
              </div>

              <Button onClick={() => setModalVisible(true)}>Вывести</Button>
            </Card>
          ))}
        </div>
      )}

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

import React, { useState } from 'react';
import { Button, Card, Modal, Progress, InputNumber, List } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import PaperCard from './PaperCard'; // Importing the PaperCard component

const Test = () => {
  const [rolls, setRolls] = useState([
    { id: '001', total: 400, used: 380, remaining: 20, paperCards: [] },
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRoll, setSelectedRoll] = useState(null);
  const [sendAmount, setSendAmount] = useState(0);

  // Handle the "Вывести" click
  const handleSendClick = (roll) => {
    setSelectedRoll(roll);
    setModalVisible(true);
  };

  // Handle modal confirmation
  const handleConfirmSend = () => {
    if (sendAmount > 0 && selectedRoll) {
      const updatedRolls = rolls.map((roll) => {
        if (roll.id === selectedRoll.id) {
          const newRemaining = roll.remaining - sendAmount;
          const newPaperCard = {
            id: roll.id + '-' + (roll.paperCards.length + 1),
            sent: sendAmount,
            printed: 0,
            remaining: sendAmount,
            received: [],
          };

          return {
            ...roll,
            remaining: newRemaining,
            used: roll.total - newRemaining,
            paperCards: [...roll.paperCards, newPaperCard],
          };
        }
        return roll;
      });

      setRolls(updatedRolls);
      setModalVisible(false);
      setSendAmount(0);
    }
  };

  return (
    <div>
      {/* Render the main rolls as tabs */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '20px' }}>
        {rolls.map((roll) => (
          <Card
            key={roll.id}
            style={{ width: 250, border: '1px solid #e8e8e8', padding: 20, textAlign: 'center' }}
          >
            <h3>Бумага №{roll.id}</h3>
            <p>без печати</p>
            <Progress percent={(roll.used / roll.total) * 100} status="active" showInfo={false} />
            <p>Использовано: {roll.used} кг</p>
            <p>Остаток: {roll.remaining} кг</p>
            <Button type="primary" onClick={() => handleSendClick(roll)}>
              Вывести
            </Button>
          </Card>
        ))}
      </div>

      {/* Modal for entering the amount to send */}
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
        />{' '}
        кг
      </Modal>

      {/* Render the generated PaperCards */}
      <div style={{ marginTop: 40 }}>
        {rolls.map((roll) =>
          roll.paperCards.map((paper) => (
            <PaperCard
              key={paper.id}
              paper={paper}
              onSend={() => {}}
              onReceive={() => {}}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Test;

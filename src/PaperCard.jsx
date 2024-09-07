import React, { useState } from 'react';
import { Card, Progress, Button, List, Modal, InputNumber, Input } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const PaperCard = ({ paper, onSend }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [clientName, setClientName] = useState('');
  const [receivedAmount, setReceivedAmount] = useState(0);

  // Open modal for receiving new paper
  const handleReceiveClick = () => {
    setModalVisible(true);
  };

  // Confirm receiving new paper and update the list
  const handleConfirmReceive = () => {
    if (receivedAmount > 0 && clientName) {
      const newReceivedItem = {
        client: clientName,
        amount: receivedAmount,
        date: new Date().toLocaleDateString('ru-RU', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
      };

      paper.received.push(newReceivedItem); // Adding the new item to the received list
      setModalVisible(false);
      setReceivedAmount(0);
      setClientName('');
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
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: 5 }}>Бумага №{paper.id}</h3>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: 0 }}>Digital Print Solutions</p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{paper.sent} кг / {paper.remaining} кг</span>
        <span style={{ color: '#1890ff', fontWeight: 'bold', fontSize: '14px' }}>Остаток: {paper.remaining} кг</span>
      </div>

      <Progress percent={(paper.sent / paper.remaining) * 100} status="active" showInfo={false} style={{ marginBottom: 10 }} />

      <div style={{ fontSize: '14px', marginBottom: 20 }}>
        <p style={{ margin: '4px 0' }}>Отправлено: <strong>{paper.sent} кг</strong></p>
        <p style={{ margin: '4px 0' }}>Распечатано: <strong>{paper.printed} кг</strong></p>
      </div>

      <Button
        type="primary"
        icon={<PlusOutlined />}
        style={{
          width: '100%',
          marginBottom: '20px',
          backgroundColor: '#ffffff',
          color: '#1890ff',
          border: '1px solid #1890ff',
        }}
        onClick={handleReceiveClick}
      >
        Добавить приход
      </Button>

      {/* Modal for adding received paper */}
      <Modal
        title="Добавить приход"
        visible={modalVisible}
        onOk={handleConfirmReceive}
        onCancel={() => setModalVisible(false)}
      >
        <p>Введите клиента:</p>
        <Input
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          placeholder="Клиент"
          style={{ marginBottom: 20 }}
        />
        <p>Сколько кг вы хотите добавить?</p>
        <InputNumber
          min={1}
          value={receivedAmount}
          onChange={(value) => setReceivedAmount(value)}
          placeholder="кг"
          style={{ width: '100%' }}
        />{' '}
        кг
      </Modal>

      {/* List of received items */}
      <List
        itemLayout="horizontal"
        dataSource={paper.received}
        renderItem={(item) => (
          <List.Item style={{ padding: '8px 0' }}>
            <List.Item.Meta
              title={<span style={{ color: '#1890ff' }}>{item.client}</span>}
              description={
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '14px' }}>{item.amount} кг</span>
                  <span style={{ color: '#888', fontSize: '14px' }}>{item.date}</span>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default PaperCard;

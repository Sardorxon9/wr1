import React, { useState } from 'react';
import { Button, Input, message } from 'antd';
import { db } from './firebase'; // Import your firebase configuration
import { doc, updateDoc } from 'firebase/firestore';

const SetupTelegram = ({ organizationID }) => {
  const [connectionCode, setConnectionCode] = useState('');

  const generateConnectionCode = () => {
    // Generate a random 10-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 12).toUpperCase();
    setConnectionCode(code);
    saveConnectionCodeToFirestore(code);
  };

  const saveConnectionCodeToFirestore = async (code) => {
    try {
      // Update the organization with the new connection code
      const orgRef = doc(db, 'organizations', organizationID);
      await updateDoc(orgRef, {
        connectionCode: code,
      });
      message.success('Код подключения успешно создан!');
    } catch (error) {
      message.error('Ошибка при создании кода подключения.');
      console.error('Error saving connection code:', error);
    }
  };

  return (
    <div>
      <h2>Настройка подключения к Telegram</h2>
      <Button type="primary" onClick={generateConnectionCode}>
        Создать код подключения к Telegram
      </Button>
      {connectionCode && (
        <div style={{ marginTop: '20px' }}>
          <Input
            value={connectionCode}
            addonAfter={
              <Button
                onClick={() => navigator.clipboard.writeText(connectionCode)}
              >
                Скопировать
              </Button>
            }
          />
        </div>
      )}
    </div>
  );
};

export default SetupTelegram;

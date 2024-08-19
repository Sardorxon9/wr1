import React, { useState } from 'react';
import { Button, Typography, message } from 'antd';
import { db, auth } from '../login-signUp/firebase'; // Ensure auth is imported from your Firebase configuration
import { doc, getDoc, setDoc, collection } from "firebase/firestore";

const { Title, Text } = Typography;

const SetupTelegram = () => {
  const [generatedCode, setGeneratedCode] = useState('');

  const generateConnectionCode = async () => {
    try {
      // Generate a unique 10-character alphanumeric code
      const token = Math.random().toString(36).substring(2, 12).toUpperCase();

      // Get the currently authenticated user's ID
      const userUid = auth.currentUser.uid;

      // Retrieve the user's document from Firestore
      const userDocRef = doc(db, "owner-users", userUid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        const data = {
          token,
          userID: userUid,
          organizationID: userData.organizationID,
          organizationName: userData.organization,
          role: 'owner', // Specifying that this is an owner
        };

        // Create a document reference with only two segments (collection name and document ID)
        const tokenDocRef = doc(db, "owner_tokens", userUid); // Reference to the user's document in owner_tokens

        // Create a sub-collection within the user's document to store the token
        const tokenCollectionRef = collection(tokenDocRef, "tokens"); // Sub-collection within the user's document
        const tokenSubDocRef = doc(tokenCollectionRef, token); // Reference to the specific token document

        // Save the token and associated data to the sub-collection in Firestore
        await setDoc(tokenSubDocRef, data);

        // Update the component state with the generated code
        setGeneratedCode(token);
        message.success('Ваш код подключения сгенерирован!');
      } else {
        throw new Error('User data not found');
      }
    } catch (error) {
      console.error('Error generating connection code:', error);
      message.error('Ошибка при создании кода подключения: ' + error.message);
    }
  };

  return (
    <div>
      <Title level={3}>Настройка Telegram Уведомлений</Title>
      <Button type="primary" onClick={generateConnectionCode}>
        Сгенерировать мой Telegram код подключения
      </Button>
      {generatedCode && (
        <div style={{ marginTop: 16 }}>
          <Text>Ваш код подключения: </Text>
          <Text copyable>{generatedCode}</Text>
        </div>
      )}
    </div>
  );
};

export default SetupTelegram;

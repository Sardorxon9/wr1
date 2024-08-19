import TelegramBot from 'node-telegram-bot-api';
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import path from 'path';

// Convert the file path to a URL that works with `readFile`
const serviceAccountPath = path.join("D:", "wr1", "src", "white-ray-app-firebase-adminsdk-z9l6r-d953374c65.json");

async function initializeFirebase() {
  try {
    const serviceAccount = JSON.parse(
      await readFile(serviceAccountPath)
    );

    // Initialize Firebase Admin SDK
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://white-ray-app.firebaseio.com',
    });

    const db = admin.firestore(); // Initialize Firestore
    return db;
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    throw error;
  }
}

// Initialize Firebase and start the bot
initializeFirebase().then((db) => {
  const token = '7536935708:AAFb8VzUJ-G8QVNrEmJBOiI5xbvT7DWKrs0';
  const bot = new TelegramBot(token, { polling: true });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
      bot.sendMessage(chatId, 'Добро пожаловать! Выберите опцию:', {
        reply_markup: {
          keyboard: [['Подключиться как владелец'], ['Подключиться как клиент']],
          one_time_keyboard: true,
        },
      });
    }

    if (text === 'Подключиться как владелец') {
      bot.sendMessage(chatId, 'Пожалуйста, введите ваш код подключения:');
      bot.once('message', async (msg) => {
        const code = msg.text.trim();
        console.log(`Received owner connection code: ${code}`);
        try {
          const tokenQuerySnapshot = await db
            .collectionGroup('tokens')  // Use collectionGroup to search across subcollections named 'tokens'
            .where('token', '==', code)
            .get();

          if (tokenQuerySnapshot.empty) {
            console.log('No matching token found.');
            bot.sendMessage(chatId, 'Код неверный. Пожалуйста, попробуйте снова.');
          } else {
            tokenQuerySnapshot.forEach(async (doc) => {
              const ownerData = doc.data();
              console.log('Owner data:', ownerData);

              await db.collection('owner-users').doc(ownerData.userID).set(
                { telegramId: chatId },
                { merge: true }
              );

              bot.sendMessage(
                chatId,
                `Соединение с организацией '${ownerData.organizationName}' установлено. Вы будете получать уведомления о заказах.`
              );
            });
          }
        } catch (error) {
          console.error('Error connecting owner:', error);
          bot.sendMessage(chatId, `Произошла ошибка. Попробуйте позже. Ошибка: ${error.message}`);
        }
      });
    }

    if (text === 'Подключиться как клиент') {
      bot.sendMessage(chatId, 'Пожалуйста, введите ваш код подключения:');
      bot.once('message', async (msg) => {
        const code = msg.text.trim();
        console.log(`Received customer connection code: ${code}`);
        try {
          const tokenQuerySnapshot = await db
            .collectionGroup('tokens')  // Use collectionGroup to search across subcollections named 'tokens'
            .where('token', '==', code)
            .get();

          if (tokenQuerySnapshot.empty) {
            console.log('No matching token found.');
            bot.sendMessage(chatId, 'Код неверный. Пожалуйста, попробуйте снова.');
          } else {
            tokenQuerySnapshot.forEach(async (doc) => {
              const customerData = doc.data();
              console.log('Customer data:', customerData);

              await db.collection('customers').doc(customerData.userID).set(
                { telegramId: chatId },
                { merge: true }
              );

              bot.sendMessage(
                chatId,
                `Соединение с компанией '${customerData.organizationName}' установлено. Вы будете получать уведомления о заказах.`
              );
            });
          }
        } catch (error) {
          console.error('Error connecting customer:', error);
          bot.sendMessage(chatId, `Произошла ошибка. Попробуйте позже. Ошибка: ${error.message}`);
        }
      });
    }
  });

  console.log('Telegram bot is running...');
}).catch((err) => {
  console.error('Failed to initialize Firebase:', err);
});

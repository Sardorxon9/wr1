import TelegramBot from 'node-telegram-bot-api';
import admin from 'firebase-admin';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert the file path to a URL that works with `readFile`
const serviceAccountPath = path.join("D:", "wr1", "src", "white-ray-app-firebase-adminsdk-z9l6r-d953374c65.json");

async function initializeFirebase() {
  const serviceAccount = JSON.parse(
    await readFile(serviceAccountPath)
  );

  // Initialize Firebase Admin SDK
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://white-ray-app.firebaseio.com', // Ensure this URL matches your Firebase database URL
  });

  return admin.firestore();
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
        try {
          const organizationRef = db.collection('organizations').where('connectionCode', '==', code);
          const snapshot = await organizationRef.get();
          if (snapshot.empty) {
            bot.sendMessage(chatId, 'Код неверный. Пожалуйста, попробуйте снова.');
          } else {
            const organizationDoc = snapshot.docs[0];
            await organizationDoc.ref.update({ ownerTelegramId: chatId });
            bot.sendMessage(chatId, `Соединение с организацией '${organizationDoc.data().name}' установлено. Вы будете получать уведомления о заказах.`);
          }
        } catch (error) {
          console.error('Error connecting owner:', error);
          bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
        }
      });
    }

    if (text === 'Подключиться как клиент') {
      bot.sendMessage(chatId, 'Пожалуйста, введите ваш код подключения:');
      bot.once('message', async (msg) => {
        const code = msg.text.trim();
        try {
          const customerRef = db.collection('customers').where('connectionCode', '==', code);
          const snapshot = await customerRef.get();
          if (snapshot.empty) {
            bot.sendMessage(chatId, 'Код неверный. Пожалуйста, попробуйте снова.');
          } else {
            const customerDoc = snapshot.docs[0];
            await customerDoc.ref.update({ telegramId: chatId });
            bot.sendMessage(chatId, `Соединение с компанией '${customerDoc.data().companyName}' установлено. Вы будете получать уведомления о заказах.`);
          }
        } catch (error) {
          console.error('Error connecting client:', error);
          bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
        }
      });
    }

    if (text === 'Отключить уведомления') {
      try {
        const orgSnapshot = await db.collection('organizations').where('ownerTelegramId', '==', chatId).get();
        const customerSnapshot = await db.collection('customers').where('telegramId', '==', chatId).get();

        if (!orgSnapshot.empty) {
          orgSnapshot.forEach((doc) => {
            doc.ref.update({ ownerTelegramId: null });
          });
          bot.sendMessage(chatId, 'Вы больше не будете получать уведомления как владелец.');
        } else if (!customerSnapshot.empty) {
          customerSnapshot.forEach((doc) => {
            doc.ref.update({ telegramId: null });
          });
          bot.sendMessage(chatId, 'Вы больше не будете получать уведомления как клиент.');
        } else {
          bot.sendMessage(chatId, 'Ваш аккаунт не найден в нашей системе.');
        }
      } catch (error) {
        console.error('Error disconnecting:', error);
        bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте позже.');
      }
    }
  });

  console.log('Telegram bot is running...');
}).catch((err) => {
  console.error('Failed to initialize Firebase:', err);
});

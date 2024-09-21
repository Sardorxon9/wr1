import React, { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Form,
  Select,
  message,
  Card,
  Progress,
  InputNumber,
  DatePicker,
  Skeleton,
} from 'antd';
import {
  doc,
  updateDoc,
  getDocs,
  collection,
  getDoc,
} from 'firebase/firestore';
import { db } from '../login-signUp/firebase';
import {
  UserOutlined,
  CalendarOutlined,
  FileDoneOutlined,
} from '@ant-design/icons';
import './PaperCard.css'; // Create a CSS file for custom styles

const { Option } = Select;

const PaperCard = ({ card, roll, organizationID, refreshPaperRolls }) => {
  const [isReceiveModalVisible, setIsReceiveModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const customerSnapshot = await getDocs(
          collection(db, `organizations/${organizationID}/customers`)
        );
        const customerList = customerSnapshot.docs.map((doc) => ({
          id: doc.id,
          brand: doc.data().brand,
        }));
        setCustomers(customerList);
      } catch (error) {
        message.error(
          'Ошибка при получении списка клиентов: ' + error.message
        );
      } finally {
        setLoading(false);
      }
    };

    if (organizationID) {
      fetchCustomers();
    }
  }, [organizationID]);

  const registerReceivedPaper = async (values) => {
    setModalLoading(true);
    try {
      const newRecord = {
        ...values,
        receiveDate: values.receiveDate.toDate(),
        receivedKg: parseFloat(values.kg),
      };

      // Fetch the current paper roll document
      const rollRef = doc(
        db,
        `organizations/${organizationID}/paper-control`,
        roll.id
      );
      const rollDoc = await getDoc(rollRef);
      if (!rollDoc.exists()) {
        message.error('Рулон бумаги не найден.');
        return;
      }
      const rollData = rollDoc.data();

      // Find the correct paper card and update its receivedRecords
      const updatedPaperCards = rollData.paperCards.map((pCard) => {
        if (pCard.id === card.id) {
          const updatedRecords = [...(pCard.receivedRecords || []), newRecord];
          const updatedPrintedKg =
            parseFloat(pCard.printedKg) + parseFloat(values.kg);
          const updatedRemainingKg =
            parseFloat(pCard.remainingKg) - parseFloat(values.kg);
          return {
            ...pCard,
            printedKg: updatedPrintedKg,
            remainingKg: updatedRemainingKg,
            receivedRecords: updatedRecords,
          };
        }
        return pCard;
      });

      // Update the Firestore document with the modified paperCards array
      await updateDoc(rollRef, { paperCards: updatedPaperCards });

      // Update customer's available paper
      const customerRef = doc(
        db,
        `organizations/${organizationID}/customers`,
        values.customerId
      );
      const customerDoc = await getDoc(customerRef);
      const currentAvailable = customerDoc.data().paper.available || 0;
      const updatedAvailable = currentAvailable + parseFloat(values.kg);

      await updateDoc(customerRef, {
        'paper.available': updatedAvailable,
      });

      message.success('Полученная бумага успешно зарегистрирована!');
      setIsReceiveModalVisible(false);
      form.resetFields();
      refreshPaperRolls();
    } catch (error) {
      message.error('Ошибка при получении бумаги: ' + error.message);
    } finally {
      setModalLoading(false);
    }
  };

  const progressPercent =
    (parseFloat(card.printedKg) / parseFloat(card.sentKg)) * 100;

  // Format the sent date
  const sentDate =
    card.sentDate instanceof Date
      ? card.sentDate
      : card.sentDate.toDate
      ? card.sentDate.toDate()
      : new Date(card.sentDate.seconds * 1000);

  const formattedSentDate = sentDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Card
      title={card.agency}
      style={{ boxShadow: '5px 8px 24px 5px rgba(208, 216, 243, 0.6)' }}
    >
      <p style={{ color: 'gray', fontSize: 14, marginBottom: '5px' , fontWeight: 200}}>
        Отправлено: {formattedSentDate}
      </p>
      <p>
        Отправлено: {card.sentKg} кг |{' '}
        <span style={{ color: '#1890ff' }}>Напечатано: {card.printedKg} кг</span>{' '}
        | Остаток: {card.remainingKg} кг
      </p>
      <Progress
        style={{ marginBottom: 25 }}
        percent={progressPercent}
        showInfo={false}
      />

      <Button
        type="primary"
        ghost
        onClick={() => setIsReceiveModalVisible(true)}
      >
        Зарегистрировать получение бумаги
      </Button>

      {/* Modal for registering received printed paper */}
      <Modal
        title="Зарегистрировать полученную бумагу"
        visible={isReceiveModalVisible}
        onCancel={() => setIsReceiveModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={modalLoading}
      >
        <Form form={form} onFinish={registerReceivedPaper}>
          <Form.Item
            name="kg"
            label="Количество полученной бумаги (кг)"
            rules={[
              {
                required: true,
                message: 'Пожалуйста, введите количество полученной бумаги!',
              },
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="customerId"
            label="Выберите клиента"
            rules={[{ required: true }]}
          >
            <Select placeholder="Выберите клиента">
              {customers.map((customer) => (
                <Option key={customer.id} value={customer.id}>
                  {customer.brand}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="receiveDate"
            label="Дата получения"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <h4>Записи о полученной бумаге:</h4>
      {loading ? (
        <Skeleton active />
      ) : card.receivedRecords && card.receivedRecords.length > 0 ? (
        card.receivedRecords.map((record, index) => {
          const customer = customers.find(
            (c) => c.id === record.customerId
          );
          const receiveDate =
            record.receiveDate instanceof Date
              ? record.receiveDate
              : record.receiveDate.toDate
              ? record.receiveDate.toDate()
              : new Date(record.receiveDate.seconds * 1000); // Handle Timestamp

          return (
            <p key={index} style={{ marginBottom: '10px' }}>
              <span style={{ marginRight: '20px' }}>
                <UserOutlined style={{ marginRight: '6px' }} />
                {customer ? customer.brand : 'Неизвестный клиент'}
              </span>
              <span style={{ marginRight: '20px' }}>
                <FileDoneOutlined style={{ marginRight: '6px' }} />
                {record.receivedKg} кг
              </span>
              <span>
                <CalendarOutlined style={{ marginRight: '6px' }} />
                {receiveDate.toLocaleDateString('ru-RU')}
              </span>
            </p>
          );
        })
      ) : (
        <p>Записи не найдены.</p>
      )}
    </Card>
  );
};

export default PaperCard;

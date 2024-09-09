import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Form, InputNumber, message, Typography, Divider } from 'antd';
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';

import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

const PaperManagement = () => {
  const { organizationID } = useOutletContext();
  const [unprintedPapers, setUnprintedPapers] = useState([]);
  const [selectedRoll, setSelectedRoll] = useState(null);
  const [isPaperModalVisible, setIsPaperModalVisible] = useState(false);
  const [printingAgencies, setPrintingAgencies] = useState([]);
  const [agencyModalVisible, setAgencyModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    if (organizationID) {
      fetchUnprintedPapers();
      fetchPrintingAgencies();
    }
  }, [organizationID]);

  const fetchUnprintedPapers = async () => {
    try {
      const unprintedPapersSnapshot = await getDocs(collection(db, `organizations/${organizationID}/paper-control`));
      const unprintedData = unprintedPapersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUnprintedPapers(unprintedData);
    } catch (error) {
      message.error('Ошибка при загрузке данных бумаги');
    }
  };

  const fetchPrintingAgencies = async () => {
    try {
      const agenciesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/printing-agencies`));
      const agenciesData = agenciesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPrintingAgencies(agenciesData);
    } catch (error) {
      message.error('Ошибка при загрузке агентств печати');
    }
  };

  const handleRegisterUnprintedPaper = async (values) => {
    try {
      await addDoc(collection(db, `organizations/${organizationID}/paper-control`), {
        ...values,
        totalWeight: values.weight,
        remainingWeight: values.weight,
        usedWeight: 0,
        alertAt: values.alertAt || 0,
      });
      message.success('Бумага успешно добавлена!');
      form.resetFields();
      setIsPaperModalVisible(false);
      fetchUnprintedPapers();
    } catch (error) {
      message.error('Ошибка при регистрации бумаги');
    }
  };

  const handleSendToAgency = async (rollID, values) => {
    try {
      const paperRef = doc(db, `organizations/${organizationID}/paper-control`, rollID);
      const agencyRef = await addDoc(collection(db, `organizations/${organizationID}/paper-control/${rollID}/agencies`), {
        agencyName: values.agency,
        paperGiven: values.paperGiven,
        dateGiven: new Date(),
        remainingWeight: values.paperGiven,
      });
      // Update unprinted paper roll stock
      await updateDoc(paperRef, {
        remainingWeight: values.remaining,
        usedWeight: values.used,
      });
      message.success('Бумага успешно отправлена агентству!');
      fetchUnprintedPapers();
    } catch (error) {
      message.error('Ошибка при отправке бумаги агентству');
    }
  };

  return (
    <div>
      <Title level={2}>Управление Бумагой</Title>

      <Button type="primary" onClick={() => setIsPaperModalVisible(true)}>Добавить новую бумагу</Button>

      <Divider />

      {/* Render Unprinted Paper Rolls */}
      <div className="unprinted-rolls">
        {unprintedPapers.map(roll => (
          <Card
            key={roll.id}
            title={`Бумага: ${roll.totalWeight} кг`}
            extra={roll.remainingWeight < roll.alertAt && <ExclamationCircleOutlined style={{ color: 'red' }} />}
            onClick={() => setSelectedRoll(roll)}
          >
            <p>Итого: {roll.totalWeight} кг</p>
            <p>Использовано: {roll.usedWeight} кг</p>
            <p>Осталось: {roll.remainingWeight} кг</p>
          </Card>
        ))}
      </div>

      {/* If a roll is selected, show printing agency options */}
      {selectedRoll && (
        <>
          <Title level={4}>Агентства, получившие бумагу</Title>
          {/* Logic to render cards with paper sent to agencies */}
        </>
      )}

      <Modal
        title="Добавить новую бумагу"
        visible={isPaperModalVisible}
        onCancel={() => setIsPaperModalVisible(false)}
        onOk={form.submit}
      >
        <Form form={form} onFinish={handleRegisterUnprintedPaper}>
          <Form.Item
            name="weight"
            label="Вес бумаги (кг)"
            rules={[{ required: true, message: 'Пожалуйста, введите вес!' }]}
          >
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item
            name="alertAt"
            label="Предупреждать при оставшемся количестве (кг)"
          >
            <InputNumber min={1} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal for sending paper to agency */}
      <Modal
        title="Отправить бумагу агентству"
        visible={agencyModalVisible}
        onCancel={() => setAgencyModalVisible(false)}
        onOk={form.submit}
      >
        <Form form={form} onFinish={(values) => handleSendToAgency(selectedRoll.id, values)}>
          <Form.Item
            name="agency"
            label="Выберите агентство"
            rules={[{ required: true, message: 'Пожалуйста, выберите агентство!' }]}
          >
            <Select>
              {printingAgencies.map(agency => (
                <Select.Option key={agency.id} value={agency.name}>{agency.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="paperGiven"
            label="Вес бумаги (кг)"
            rules={[{ required: true, message: 'Пожалуйста, введите вес!' }]}
          >
            <InputNumber min={1} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default PaperManagement;

import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Input, message, InputNumber } from 'antd';
import PaperRoll from './PaperRoll';
import { db } from '../login-signUp/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';

const ManagePaper = () => {
  const [isPaperRollModalVisible, setIsPaperRollModalVisible] = useState(false);
  const [isAgencyModalVisible, setIsAgencyModalVisible] = useState(false);
  const [paperRolls, setPaperRolls] = useState([]);
  const [form] = Form.useForm();
  const [agencyForm] = Form.useForm();
  const [selectedRollId, setSelectedRollId] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [agencyModalLoading, setAgencyModalLoading] = useState(false);

  const { organizationID } = useOutletContext();

  useEffect(() => {
    if (organizationID) {
      fetchPaperRolls();
    }
  }, [organizationID]);

  const fetchPaperRolls = async () => {
    const paperRollRef = collection(
      db,
      `organizations/${organizationID}/paper-control`
    );
    const snapshot = await getDocs(paperRollRef);
    const rolls = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setPaperRolls(rolls);
  };

  const registerPaperRoll = async (values) => {
    setModalLoading(true);
    try {
      const paperControlRef = collection(
        db,
        `organizations/${organizationID}/paper-control`
      );
      await addDoc(paperControlRef, {
        ...values,
        dateRegistered: new Date(),
        used: 0,
        remaining: values.kg,
        paperCards: [],
      });
      setIsPaperRollModalVisible(false);
      form.resetFields();
      fetchPaperRolls();
      message.success('Рулон успешно зарегистрирован!');
    } catch (error) {
      message.error('Ошибка при регистрации рулона: ' + error.message);
    } finally {
      setModalLoading(false);
    }
  };

  const registerAgency = async (values) => {
    setAgencyModalLoading(true);
    try {
      const agencyRef = collection(
        db,
        `organizations/${organizationID}/agencies`
      );
      await addDoc(agencyRef, {
        name: values.name,
      });
      message.success('Агентство успешно зарегистрировано!');
      setIsAgencyModalVisible(false);
      agencyForm.resetFields();
    } catch (error) {
      message.error('Ошибка при регистрации агентства: ' + error.message);
    } finally {
      setAgencyModalLoading(false);
    }
  };

  return (
    <div className="manage-paper-container">
      <Button
        type="primary"
        onClick={() => setIsPaperRollModalVisible(true)}
        style={{ marginRight: '10px' }}
      >
        Зарегистрировать новый рулон
      </Button>

      <Button type="dashed" onClick={() => setIsAgencyModalVisible(true)}>
        Зарегистрировать агентство
      </Button>

      {/* Modal for registering a new paper roll */}
      <Modal
        title="Регистрация нового рулона"
        visible={isPaperRollModalVisible}
        onCancel={() => setIsPaperRollModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={modalLoading}
      >
        <Form form={form} onFinish={registerPaperRoll}>
          <Form.Item
            name="name"
            label="Название бумаги"
            rules={[{ required: true, message: 'Пожалуйста, введите название бумаги!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="kg"
            label="Количество (кг)"
            rules={[
              { required: true, message: 'Пожалуйста, введите количество (кг)!' },
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal for registering a new agency */}
      <Modal
        title="Регистрация нового агентства"
        visible={isAgencyModalVisible}
        onCancel={() => setIsAgencyModalVisible(false)}
        onOk={() => agencyForm.submit()}
        confirmLoading={agencyModalLoading}
      >
        <Form form={agencyForm} onFinish={registerAgency}>
          <Form.Item
            name="name"
            label="Название агентства"
            rules={[{ required: true, message: 'Пожалуйста, введите название агентства!' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Horizontal paper roll container */}
      <div className="paper-roll-list">
        {paperRolls.map((roll) => (
          <PaperRoll
            key={roll.id}
            roll={roll}
            isSelected={roll.id === selectedRollId}
            onSelect={(id) => setSelectedRollId(id)}
            organizationID={organizationID}
            refreshPaperRolls={fetchPaperRolls}
          />
        ))}
      </div>
    </div>
  );
};

export default ManagePaper;

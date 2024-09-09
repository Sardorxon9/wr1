import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Select, Space, Badge } from 'antd';
import { collection, addDoc, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from '../login-signUp/firebase';

const PaperControl = () => {
  const [unprintedRolls, setUnprintedRolls] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [selectedRoll, setSelectedRoll] = useState(null);

  useEffect(() => {
    const fetchPaperAndAgencies = async () => {
      // Fetch unprinted rolls
      const unprintedRollsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/paper-control`));
      const unprintedRollsData = unprintedRollsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUnprintedRolls(unprintedRollsData);

      // Fetch agencies
      const agenciesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/printing-agencies`));
      const agenciesData = agenciesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAgencies(agenciesData);

      setLoading(false);
    };

    fetchPaperAndAgencies();
  }, []);

  const showModal = (roll) => {
    setSelectedRoll(roll);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    form.resetFields();
  };

  const handleAddPaperToAgency = async (values) => {
    try {
      const { agency, paperWeight } = values;
      // Update the unprinted roll and create a record for the agency
      const updatedRemaining = selectedRoll.remaining - paperWeight;

      if (updatedRemaining < 0) {
        throw new Error('Недостаточно бумаги для отправки.');
      }

      await updateDoc(doc(db, `organizations/${organizationID}/paper-control`, selectedRoll.id), {
        remaining: updatedRemaining,
        used: selectedRoll.used + paperWeight,
      });

      // Add record to track the paper given to the agency
      await addDoc(collection(db, `organizations/${organizationID}/printing-agency-paper`), {
        agency,
        paperWeight,
        dateGiven: new Date(),
        rollId: selectedRoll.id,
        remaining: paperWeight,  // Remaining amount with the agency
      });

      message.success('Бумага успешно отправлена в агентство!');
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Ошибка: ' + error.message);
    }
  };

  const paperColumns = [
    {
      title: 'Вес рулона',
      dataIndex: 'weight',
      key: 'weight',
      render: (weight) => `${weight} кг`,
    },
    {
      title: 'Использовано',
      dataIndex: 'used',
      key: 'used',
      render: (used) => `${used} кг`,
    },
    {
      title: 'Осталось',
      dataIndex: 'remaining',
      key: 'remaining',
      render: (remaining) => `${remaining} кг`,
    },
    {
      title: 'Действие',
      key: 'action',
      render: (roll) => (
        <Button onClick={() => showModal(roll)}>
          Отправить в агентство
        </Button>
      ),
    },
  ];

  return (
    <div>
      <h2>Управление бумагой</h2>
      <Table dataSource={unprintedRolls} columns={paperColumns} rowKey="id" loading={loading} />

      <Modal
        title="Отправить бумагу в агентство"
        visible={isModalVisible}
        onCancel={handleCancel}
        onOk={form.submit}
        okText="Отправить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" onFinish={handleAddPaperToAgency}>
          <Form.Item name="agency" label="Агентство" rules={[{ required: true, message: 'Пожалуйста, выберите агентство!' }]}> 
            <Select placeholder="Выберите агентство"> {agencies.map((agency) => ( 
                <Select.Option key={agency.id} value={agency.id}> {agency.name} </Select.Option> ))}
                 </Select>
                  </Form.Item> 
                  <Form.Item name="paperWeight" label="Вес бумаги для отправки (кг)" rules={[ { required: true, message: 'Укажите вес бумаги!' },
                     { type: 'number', min: 1, max: selectedRoll ? selectedRoll.remaining : 1000, message: 'Недопустимый вес бумаги!' } ]} >
                     <InputNumber min={1} max={selectedRoll ? selectedRoll.remaining : 1000} step={0.1} style={{ width: '100%' }} />
                      </Form.Item>
                       </Form> </Modal> </div> ); };

export default PaperControl;

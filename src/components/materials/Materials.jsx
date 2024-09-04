import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Typography, Progress } from 'antd';
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';
import { ExclamationCircleOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Materials = () => {
  const { organizationID } = useOutletContext(); 
  const [materials, setMaterials] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationID) {
      const fetchMaterials = async () => {
        try {
          const materialsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/materials`));
          const materialsData = materialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMaterials(materialsData);
        } catch (error) {
          message.error('Ошибка при загрузке материалов: ' + error.message);
        } finally {
          setLoading(false);
        }
      };

      fetchMaterials();
    }
  }, [organizationID]);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleAddMaterial = async (values) => {
    try {
      const newMaterial = {
        ...values,
        used: 0,
        available: values.total,
        dateAdded: new Date(),
      };
      await addDoc(collection(db, `organizations/${organizationID}/materials`), newMaterial);
      message.success('Материал успешно добавлен!');
      setIsModalVisible(false);
      form.resetFields();
      setMaterials([...materials, newMaterial]);
    } catch (error) {
      message.error('Ошибка при добавлении материала: ' + error.message);
    }
  };

  const columns = [
    {
      title: 'Материал',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <span>
          {name} {record.available === 0 && <ExclamationCircleOutlined style={{ color: 'red', marginLeft: 8 }} />}
        </span>
      ),
    },
    {
      title: 'Дата добавления',
      dataIndex: 'dateAdded',
      key: 'dateAdded',
      render: (date) => {
        if (date instanceof Date) {
          return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).replace(' г.', '');
        } else if (date && date.seconds) {
          return new Date(date.seconds * 1000).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).replace(' г.', '');
        } else {
          return 'Дата не указана';
        }
      },
    },
    {
      title: 'Общее количество (кг)',
      dataIndex: 'total',
      key: 'total',
    },
    {
      title: 'Использовано (кг)',
      dataIndex: 'used',
      key: 'used',
    },
    {
      title: 'Доступно (кг)',
      dataIndex: 'available',
      key: 'available',
      render: (available, record) => {
        const used = record.used || 0;
        const availablePercent = record.total ? ((available / record.total) * 100) : 0;

        return (
          <div>
            <Progress 
              percent={availablePercent} 
              status="active" 
              showInfo={false} 
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ color: '#595959' }}>
                 Использовано: {used.toFixed(2)} кг
              </span>
              <span style={{ color: '#1677FF' }}>
              ● Доступно: {available.toFixed(2)} кг
              </span>
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <Title level={2}>Материалы</Title>
      <Button type="primary" onClick={showModal} style={{ marginBottom: 20 }}>
        Добавить новый материал
      </Button>
      <Table dataSource={materials} columns={columns} rowKey="id" loading={loading} />

      <Modal
        title="Добавить новый материал"
        visible={isModalVisible}
        onCancel={handleCancel}
        onOk={form.submit}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" onFinish={handleAddMaterial}>
          <Form.Item 
            name="name" 
            label="Название материала" 
            rules={[{ required: true, message: 'Пожалуйста, введите название материала!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item 
            name="total" 
            label="Общее количество (кг)" 
            rules={[{ required: true, message: 'Пожалуйста, введите количество!' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Materials;

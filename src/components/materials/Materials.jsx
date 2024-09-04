import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Typography, Card, Progress, Space } from 'antd';
import { collection, addDoc, getDocs, query, where, orderBy, updateDoc, doc } from "firebase/firestore";
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';
import { ExclamationCircleOutlined, PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

const Materials = () => {
  const { organizationID } = useOutletContext();
  const [materials, setMaterials] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [typeForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(null);

  useEffect(() => {
    if (organizationID) {
      fetchMaterials();
      fetchMaterialTypes();
    }
  }, [organizationID]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const materialsSnapshot = await getDocs(query(collection(db, `organizations/${organizationID}/materials`), orderBy('dateAdded', 'asc')));
      const materialsData = materialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMaterials(materialsData);
    } catch (error) {
      message.error('Ошибка при загрузке материалов: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialTypes = async () => {
    try {
      const typesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/material-types`));
      const typesData = typesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMaterialTypes(typesData);
    } catch (error) {
      message.error('Ошибка при загрузке типов материалов: ' + error.message);
    }
  };

  const showModal = (type) => {
    setSelectedType(type);
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setIsTypeModalVisible(false);
  };

  const handleAddMaterialType = async (values) => {
    try {
      await addDoc(collection(db, `organizations/${organizationID}/material-types`), values);
      message.success('Тип материала успешно добавлен!');
      setIsTypeModalVisible(false);
      typeForm.resetFields();
      fetchMaterialTypes();
    } catch (error) {
      message.error('Ошибка при добавлении типа материала: ' + error.message);
    }
  };

  const handleAddMaterial = async (values) => {
    try {
      const newMaterial = {
        ...values,
        type: selectedType.name,
        used: 0,
        available: values.total,
        dateAdded: new Date(),
      };
      await addDoc(collection(db, `organizations/${organizationID}/materials`), newMaterial);
      message.success('Материал успешно добавлен!');
      setIsModalVisible(false);
      form.resetFields();
      fetchMaterials();
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
      render: (date) => new Date(date.seconds * 1000).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' }).replace(' г.', ''),
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
              percent={100 - availablePercent}
              status="active"
              showInfo={false}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <span style={{ color: '#595959' }}>
                ● Использовано: {used.toFixed(2)} кг
              </span>
              <span style={{ color: '#1677FF' }}>
                Доступно: {available.toFixed(2)} кг
              </span>
            </div>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <Title level={2}>Типы материалов</Title>
      <Space direction="vertical" style={{ marginBottom: 20 }}>
  {materialTypes.map(type => (
    <Card 
      key={type.id} 
      title={type.name} 
      extra={
        <div style={{ marginLeft: 10 }}> {/* Added margin for spacing */}
          <Button icon={<PlusOutlined />} onClick={() => showModal(type)}>
            Добавить
          </Button>
        </div>
      }
    >
    
    </Card>
  ))}
  <Button type="primary" onClick={() => setIsTypeModalVisible(true)}>
    Добавить новый тип материала
  </Button>
</Space>


      <Title level={2}>Запасы материалов</Title>
      <Table dataSource={materials} columns={columns} rowKey="id" loading={loading} />

      <Modal
        title="Добавить новый тип материала"
        visible={isTypeModalVisible}
        onCancel={handleCancel}
        onOk={typeForm.submit}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={typeForm} layout="vertical" onFinish={handleAddMaterialType}>
          <Form.Item
            name="name"
            label="Название типа материала"
            rules={[{ required: true, message: 'Пожалуйста, введите название типа материала!' }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Добавить ${selectedType ? selectedType.name : ''}`}
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

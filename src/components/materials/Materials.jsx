import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Typography,
  Card,
  Progress,
  Space,
  Divider,
  Radio,
  Spin,
} from 'antd';
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';
import {
  ExclamationCircleOutlined,
  PlusOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import './Materials.css';

const { Title, Text } = Typography;

const Materials = () => {
  const { organizationID, role } = useOutletContext();
  const [materials, setMaterials] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isTypeModalVisible, setIsTypeModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [typeForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(null);
  const [viewMode, setViewMode] = useState('table');

  useEffect(() => {
    if (organizationID) {
      fetchMaterials();
      fetchMaterialTypes();
    }
  }, [organizationID]);

  // Automatically switch to card view on small screens
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth <= 768) {
        setViewMode('card');
      } else {
        setViewMode('table');
      }
    }

    window.addEventListener('resize', handleResize);

    // Initial check
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const materialsSnapshot = await getDocs(
        query(
          collection(db, `organizations/${organizationID}/materials`),
          orderBy('dateAdded', 'asc')
        )
      );
      const materialsData = materialsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMaterials(materialsData);
    } catch (error) {
      message.error('Ошибка при загрузке сырья: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterialTypes = async () => {
    try {
      const typesSnapshot = await getDocs(
        collection(db, `organizations/${organizationID}/material-types`)
      );
      const typesData = typesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMaterialTypes(typesData);
    } catch (error) {
      message.error('Ошибка при загрузке видов сырья: ' + error.message);
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
      await addDoc(
        collection(db, `organizations/${organizationID}/material-types`),
        values
      );
      message.success('Вид сырья успешно добавлен!');
      setIsTypeModalVisible(false);
      typeForm.resetFields();
      fetchMaterialTypes();
    } catch (error) {
      message.error('Ошибка при добавлении вида сырья: ' + error.message);
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
      await addDoc(
        collection(db, `organizations/${organizationID}/materials`),
        newMaterial
      );
      message.success('Сырье успешно добавлено!');
      setIsModalVisible(false);
      form.resetFields();
      fetchMaterials();
    } catch (error) {
      message.error('Ошибка при добавлении сырья: ' + error.message);
    }
  };

  const columns = [
    {
      title: 'Сырье',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <span>
          {name}{' '}
          {record.available === 0 && (
            <ExclamationCircleOutlined style={{ color: 'red', marginLeft: 8 }} />
          )}
        </span>
      ),
    },
    {
      title: 'Дата добавления',
      dataIndex: 'dateAdded',
      key: 'dateAdded',
      render: (date) =>
        date && date.seconds
          ? new Date(date.seconds * 1000)
              .toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
              .replace(' г.', '')
          : 'Дата не указана',
    },
    {
      title: 'Итого (кг)',
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
        const total = record.total || 0;
        const usedPercent = total ? (used / total) * 100 : 0;

        return (
          <div>
            <Progress percent={usedPercent} status="active" showInfo={false} />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 8,
              }}
            >
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

  const handleTagClick = (value) => {
    form.setFieldsValue({ total: value });
  };

  // Calculate summary for each material type
  const getSummary = (typeName) => {
    const filtered = materials.filter((m) => m.type === typeName);
    const totalAdded = filtered.reduce((sum, m) => sum + m.total, 0);
    const totalAvailable = filtered.reduce((sum, m) => sum + m.available, 0);
    const totalUsed = filtered.reduce((sum, m) => sum + m.used, 0);
    return { totalAdded, totalAvailable, totalUsed };
  };

  const renderCardView = () => {
    return (
      <div className="card-container">
        {materials.map((material) => {
          const usedPercent = material.total
            ? (material.used / material.total) * 100
            : 0;
          return (
            <Card key={material.id} className="material-card">
              <Text
                type="secondary"
                style={{ display: 'block', marginBottom: 8 }}
              >
                {material.dateAdded && material.dateAdded.seconds
                  ? new Date(material.dateAdded.seconds * 1000).toLocaleDateString(
                      'ru-RU'
                    )
                  : 'Дата не указана'}
              </Text>
              <Text strong style={{ fontSize: 18, marginBottom: 4 }}>
                {material.name || 'Сырье не указано'}
              </Text>
              <Text style={{ display: 'block', color: '#6B7280' }}>
                {material.type || 'Тип сырья не указан'}
              </Text>
              <div style={{ marginTop: 8, marginBottom: 8 }}>
                <Text strong>Итого:</Text> {material.total.toLocaleString()} кг
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Использовано:</Text> {material.used.toLocaleString()} кг
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Доступно:</Text> {material.available.toLocaleString()} кг
              </div>
              <Progress percent={usedPercent} status="active" showInfo={false} />
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div>
      <div className="materials-header">
        <Title level={2}>Виды сырья</Title>
        <Radio.Group
          onChange={(e) => setViewMode(e.target.value)}
          value={viewMode}
        >
          <Radio.Button value="table">
            <UnorderedListOutlined />
          </Radio.Button>
          <Radio.Button value="card">
            <AppstoreOutlined />
          </Radio.Button>
        </Radio.Group>
      </div>

      <Space
        wrap
        style={{
          display: 'flex',
          justifyContent: 'flex-start',
          marginBottom: 20,
        }}
      >
        {materialTypes.map((type) => {
          const summary = getSummary(type.name);
          return (
            <Card
              key={type.id}
              title={type.name}
              extra={
                role === 'owner' && (
                  <Button icon={<PlusOutlined />} onClick={() => showModal(type)}>
                    Добавить
                  </Button>
                )
              }
              style={{
                width: 300,
                boxShadow: '0px 9px 28px rgba(0, 0, 0, 0.05)',
              }}
            >
              <div style={{ marginBottom: 8 }}>
                <Text strong>Итого:</Text> {summary.totalAdded.toLocaleString()} кг
              </div>
              <div style={{ marginBottom: 8 }}>
                <Text strong>Итого доступно:</Text> {summary.totalAvailable.toLocaleString()} кг
              </div>
              <div>
                <Text strong>Итого использовано:</Text> {summary.totalUsed.toLocaleString()} кг
              </div>
            </Card>
          );
        })}
        {role === 'owner' && (
          <Card
            style={{
              width: 300,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={() => setIsTypeModalVisible(true)}
          >
            <Button
              type="primary"
              ghost
              icon={<PlusOutlined />}
              style={{ width: '100%' }}
            >
              Добавить новый вид сырья
            </Button>
          </Card>
        )}
      </Space>
      <Divider
        style={{
          borderColor: '#0050b3',
          padding: '2%',
        }}
      >
        <Text type="secondary"> Склад</Text>
      </Divider>
      <Title level={2}>Запасы сырья</Title>

      {loading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <Spin size="large" />
        </div>
      ) : viewMode === 'table' ? (
        <Table
          dataSource={materials}
          columns={columns}
          rowKey="id"
          loading={loading}
        />
      ) : (
        renderCardView()
      )}

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
            label="Название сырья"
            rules={[
              { required: true, message: 'Пожалуйста, введите название сырья!' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="total"
            label="Общее количество (кг)"
            rules={[
              { required: true, message: 'Пожалуйста, введите количество!' },
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <div style={{ marginTop: 10, display: 'flex', gap: '8px' }}>
            <Button
              type="default"
              onClick={() => handleTagClick(10)}
              style={{ flex: 1 }}
              className="quantity-button"
            >
              10 кг
            </Button>
            <Button
              type="default"
              onClick={() => handleTagClick(25)}
              style={{ flex: 1 }}
              className="quantity-button"
            >
              25 кг
            </Button>
            <Button
              type="default"
              onClick={() => handleTagClick(50)}
              style={{ flex: 1 }}
              className="quantity-button"
            >
              50 кг
            </Button>
          </div>
        </Form>
      </Modal>

      {role === 'owner' && (
        <Modal
          title="Добавить новый вид сырья"
          visible={isTypeModalVisible}
          onCancel={handleCancel}
          onOk={typeForm.submit}
          okText="Добавить"
          cancelText="Отмена"
        >
          <Form
            form={typeForm}
            layout="vertical"
            onFinish={handleAddMaterialType}
          >
            <Form.Item
              name="name"
              label="Название вида сырья"
              rules={[
                {
                  required: true,
                  message: 'Пожалуйста, введите название вида сырья!',
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default Materials;

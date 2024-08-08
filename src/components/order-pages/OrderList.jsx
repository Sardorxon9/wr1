import React, { useState, useEffect } from 'react';
import { EditableProTable } from '@ant-design/pro-components';
import { Select, message, Typography, Badge, Radio, Card, Switch, Tabs, Spin } from 'antd';
import { UnorderedListOutlined, AppstoreOutlined, CodeSandboxOutlined, CarOutlined, LoadingOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from '../login-signUp/firebase';
import './OrderList.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const statusOptions = [
  { label: 'В процессе', value: 'in-progress', color: 'orange', backgroundColor: '#E6F4FF', textColor: '#355A77', icon: <CarOutlined /> },
  { label: 'Доставлено', value: 'delivered', color: 'green', backgroundColor: '#E3F6EB', textColor: '#3D8C5C', icon: <CarOutlined /> },
  { label: 'Готов к отправке', value: 'ready', color: 'blue', backgroundColor: '#FDEADC', textColor: '#D8844C', icon: <CodeSandboxOutlined /> },
];

const OrderList = () => {
  const [editableKeys, setEditableRowKeys] = useState([]);
  const [dataSource, setDataSource] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [organizationID, setOrganizationID] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "owner-users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setOrganizationID(userDocSnap.data().organizationID);
        } else {
          console.error("No such user!");
        }
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      if (organizationID) {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, `organizations/${organizationID}/orders`));
        const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDataSource(orders);
        setEditableRowKeys(orders.map(order => order.id));
        setLoading(false);
      }
    };

    fetchOrders();
  }, [organizationID]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      const newData = dataSource.map(item => (item.id === id ? { ...item, status: newStatus } : item));
      setDataSource(newData);

      const orderRef = doc(db, `organizations/${organizationID}/orders`, id);
      await updateDoc(orderRef, { status: newStatus });
      message.success('Статус успешно обновлен!');
    } catch (error) {
      message.error('Ошибка обновления статуса: ' + error.message);
    }
  };

  const renderCardView = () => {
    const filteredOrders = selectedStatus === 'all'
      ? dataSource
      : dataSource.filter(order => order.status === selectedStatus);
    return (
      <div className="card-container">
        {filteredOrders.map(order => {
          const statusOption = statusOptions.find(option => option.value === order.status);
          return (
            <Card key={order.id} className="order-card">
              <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                {new Date(order.date.seconds * 1000).toLocaleDateString('ru-RU')}
              </Text>
              <Text strong style={{ fontSize: 18, marginBottom: 4 }}>{order.client}</Text>
              <Text style={{ display: 'block', marginBottom: 8 }}>{order.product}</Text>
              <Text style={{ color: '#1890ff', display: 'block', marginBottom: 8 }}>{order.quantity} шт</Text>
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <Text strong style={{ fontSize: 24, color: '#000' }}>
                  {(order.quantity * order.price).toLocaleString('ru-RU')}
                </Text>
                <Text style={{ display: 'block', color: '#6B7280', fontSize: 14 }}>
                  {order.price.toLocaleString('ru-RU')} сум/шт
                </Text>
              </div>
              <Badge
                color={statusOption.backgroundColor}
                text={(
                  <>
                    {statusOption.icon}
                    <span style={{ marginLeft: 4 }}>{statusOption.label}</span>
                  </>
                )}
                style={{ backgroundColor: statusOption.backgroundColor, color: statusOption.textColor, marginBottom: 16, display: 'block', padding: '5px 10px', borderRadius: '5px' }}
              />
              <div className="order-card-switch">
                <Switch
                  checked={order.status === 'delivered'}
                  onChange={(checked) => handleStatusChange(order.id, checked ? 'delivered' : 'in-progress')}
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: '#68768C' }}>{order.status === 'delivered' ? 'Доставлено' : 'Изменить на : Доставлено'}</Text>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  const columns = [
    {
      title: 'ДАТА',
      dataIndex: 'date',
      editable: false,
      render: (_, record) => {
        return new Date(record.date.seconds * 1000).toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      },
    },
    {
      title: 'КЛИЕНТ',
      dataIndex: 'client',
      editable: false,
    },
    {
      title: 'ПРОДУКТ',
      dataIndex: 'product',
      editable: false,
      render: (_, record) => {
        const [mainCategory, subCategory] = record.product.split(' > ');
        return (
          <span>
            <span style={{ fontWeight: 'bold', color: '#1F2A37' }}>{mainCategory}</span> 
            {' > '}
            <span style={{ color: '#6B7280' }}>{subCategory}</span>
          </span>
        );
      },
    },
    {
      title: 'КОЛИЧЕСТВО',
      dataIndex: 'quantity',
      valueType: 'digit',
      editable: false,
    },
    {
      title: 'ЦЕНА',
      dataIndex: 'price',
      valueType: 'text',
      editable: false,
      render: (_, record) => (
        <div style={{ textAlign: 'left' }}>
          <Text  style={{ fontSize: 16, fontWeight: 600, color: '#000' }}>
            {(record.quantity * record.price * 1000).toLocaleString('ru-RU')}
          </Text>
          <Text style={{ display: 'block', fontWeight: 200, color: '#6B7280', fontSize: 14 }}>
            {record.price.toLocaleString('ru-RU')} сум/шт
          </Text>
        </div>
      ),
    },
    {
      title: 'СТАТУС',
      dataIndex: 'status',
      valueType: 'select',
      renderFormItem: (_, { record }) => (
        <Select
          placeholder="Выберите статус"
          defaultValue={record.status}
          style={{ width: '100%' }}
          dropdownStyle={{ minWidth: '160px' }}
        >
          {statusOptions.map(option => (
            <Select.Option key={option.value} value={option.value}>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <Badge color={option.color} />
                <span style={{ marginLeft: 8 }}>{option.label}</span>
              </span>
            </Select.Option>
          ))}
        </Select>
      ),
      render: (_, record) => {
        const statusOption = statusOptions.find(option => option.value === record.status);
        if (statusOption) {
          return (
            <Badge
              color={statusOption.backgroundColor}
              text={(
                <>
                  {statusOption.icon}
                  <span style={{ marginLeft: 4 }}>{statusOption.label}</span>
                </>
              )}
              style={{ backgroundColor: statusOption.backgroundColor, color: statusOption.textColor }}
            />
          );
        }
        return null;
      },
    },
  ];

  const filteredDataSource = selectedStatus === 'all'
    ? dataSource
    : dataSource.filter(order => order.status === selectedStatus);

  return (
    <>
      <div className="order-list-header">
        <Title level={2}>Заказы</Title>
        <Radio.Group onChange={e => setViewMode(e.target.value)} value={viewMode}>
          <Radio.Button value="table">
            <UnorderedListOutlined />
          </Radio.Button>
          <Radio.Button value="card">
            <AppstoreOutlined />
          </Radio.Button>
        </Radio.Group>
      </div>
      <Tabs defaultActiveKey="all" onChange={key => setSelectedStatus(key)}>
        <TabPane tab="Все" key="all" />
        {statusOptions.map(option => (
          <TabPane tab={option.label} key={option.value} />
        ))}
      </Tabs>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </div>
      ) : viewMode === 'table' ? (
        <EditableProTable
          rowKey="id"
          headerTitle="Список заказов"
          columns={columns}
          value={filteredDataSource}
          onChange={setDataSource}
          editable={{
            type: 'single',
            editableKeys,
            onSave: handleStatusChange,
            onChange: setEditableRowKeys,
          }}
          recordCreatorProps={false} 
        />
      ) : (
        renderCardView()
      )}
    </>
  );
};

export default OrderList;

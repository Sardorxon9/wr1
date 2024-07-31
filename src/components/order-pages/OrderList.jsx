import React, { useState, useEffect } from 'react';
import { EditableProTable } from '@ant-design/pro-components';
import { Select, message, Typography, Badge, Radio, Card, Switch } from 'antd';
import { UnorderedListOutlined, AppstoreOutlined, CodeSandboxOutlined, CarOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { auth, db } from '../login-signUp/firebase'; // Adjust the import path according to your project structure
import './OrderList.css';

const { Title, Text } = Typography;

const statusOptions = [
  { label: 'В процессе', value: 'in-progress', color: 'orange', backgroundColor: '#E6F4FF', textColor: '#355A77', icon: <CarOutlined /> },
  { label: 'Доставлено', value: 'delivered', color: 'green', backgroundColor: '#E3F6EB', textColor: '#3D8C5C', icon: <CarOutlined /> },
  { label: 'Готов к отправке', value: 'ready', color: 'blue', backgroundColor: '#FDEADC', textColor: '#D8844C', icon: <CodeSandboxOutlined /> },
];

const OrderList = () => {
  const [editableKeys, setEditableRowKeys] = useState([]);
  const [dataSource, setDataSource] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [organizationID, setOrganizationID] = useState('');

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
        const querySnapshot = await getDocs(collection(db, `organizations/${organizationID}/orders`));
        const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setDataSource(orders);
        setEditableRowKeys(orders.map(order => order.id));
      }
    };

    fetchOrders();
  }, [organizationID]);

  const handleSave = async (row) => {
    try {
      const newData = [...dataSource];
      const index = newData.findIndex((item) => row.id === item.id);
      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, { ...item, ...row });
        setDataSource(newData);

        const orderRef = doc(db, `organizations/${organizationID}/orders`, row.id);
        await updateDoc(orderRef, row);

        message.success('Данные успешно сохранены!');
      }
    } catch (error) {
      message.error('Ошибка сохранения данных: ' + error.message);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const newData = dataSource.map(item => (item.id === id ? { ...item, status: newStatus } : item));
      setDataSource(newData);

      const orderRef = doc(db, `organizations/${organizationID}/orders`, id);
      await updateDoc(orderRef, { status: newStatus });
    } catch (error) {
      message.error('Ошибка обновления статуса: ' + error.message);
    }
  };

  const renderCardView = () => (
    <div className="card-container">
      {dataSource.map(order => (
        <Card key={order.id} className="order-card">
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>{new Date(order.date.seconds * 1000).toLocaleDateString()}</Text>
          <Text strong style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{order.client.toUpperCase()}</Text>
          <Text style={{ display: 'block', marginBottom: 8 }}>{order.product}</Text>
          <Text style={{ color: '#1890ff', display: 'block', marginBottom: 8 }}>{order.quantity} шт</Text>
          <Text strong style={{ fontSize: 20, fontWeight: 600, display: 'block', marginBottom: 16 }}>{order.price}</Text>
          <Badge
            color={statusOptions.find(option => option.value === order.status).backgroundColor}
            text={(
              <>
                {statusOptions.find(option => option.value === order.status).icon}
                <span style={{ marginLeft: 4 }}>{statusOptions.find(option => option.value === order.status).label}</span>
              </>
            )}
            style={{ backgroundColor: statusOptions.find(option => option.value === order.status).backgroundColor, color: statusOptions.find(option => option.value === order.status).textColor, marginBottom: 16, display: 'block', padding: '5px 10px', borderRadius: '5px' }}
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
      ))}
    </div>
  );

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      editable: false,
    },
    {
      title: 'Клиент',
      dataIndex: 'client',
      editable: false,
    },
    {
      title: 'Продукт',
      dataIndex: 'product',
      editable: false,
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      valueType: 'digit',
      editable: false,
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      valueType: 'text',
      editable: false,
    },
    {
      title: 'Статус',
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
      {viewMode === 'table' ? (
        <EditableProTable
          rowKey="id"
          headerTitle="Список заказов"
          columns={columns}
          value={dataSource}
          onChange={setDataSource}
          editable={{
            type: 'single',
            editableKeys,
            onSave: handleSave,
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

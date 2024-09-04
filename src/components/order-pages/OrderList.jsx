import React, { useState, useEffect } from 'react';
import { EditableProTable } from '@ant-design/pro-components';
import { Select, message, Typography, Badge, Radio, Card, Switch, Tabs, Spin, Popconfirm, Button } from 'antd';
import { UnorderedListOutlined, AppstoreOutlined, CodeSandboxOutlined, CarOutlined, LoadingOutlined, DeleteOutlined } from '@ant-design/icons';
import { collection, getDocs, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';
import './OrderList.css';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const statusOptions = [
  { label: 'В процессе', value: 'in-progress', color: 'orange', backgroundColor: '#E6F4FF', textColor: '#355A77', icon: <CarOutlined /> },
  { label: 'Доставлено', value: 'delivered', color: 'green', backgroundColor: '#E3F6EB', textColor: '#3D8C5C', icon: <CarOutlined /> },
  { label: 'Готов к отправке', value: 'ready', color: 'blue', backgroundColor: '#FDEADC', textColor: '#D8844C', icon: <CodeSandboxOutlined /> },
];

const OrderList = () => {
  const { organizationID, role } = useOutletContext(); // Get organizationID and role from context
  const [editableKeys, setEditableRowKeys] = useState([]);
  const [dataSource, setDataSource] = useState([]);
  const [viewMode, setViewMode] = useState('table');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (organizationID) {
      fetchOrders(organizationID);
    } else {
      console.error('Organization ID is not defined');
    }
  }, [organizationID]);

  const fetchOrders = async (orgID) => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, `organizations/${orgID}/orders`));
      const orders = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setDataSource(orders);
      setEditableRowKeys(orders.map(order => order.id));
    } catch (error) {
      console.error("Error fetching orders:", error);
      message.error("Ошибка при загрузке заказов.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async (id) => {
    try {
      const orderDoc = await getDoc(doc(db, `organizations/${organizationID}/orders`, id));
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();
        const selectedProduct = dataSource.find(product => product.name === orderData.product);
        if (selectedProduct) {
          const materialSnapshot = await getDocs(collection(db, `organizations/${organizationID}/materials`));
          const materialData = materialSnapshot.docs.find(doc => doc.data().name === selectedProduct.material);
          if (materialData) {
            const materialDocRef = doc(db, `organizations/${organizationID}/materials`, materialData.id);
            const used = materialData.data().used - (orderData.quantity * selectedProduct.weight / 1000);
            const available = materialData.data().total - used;
            await updateDoc(materialDocRef, { used, available });
          }
        }
      }

      await deleteDoc(doc(db, `organizations/${organizationID}/orders`, id));
      setDataSource(dataSource.filter(order => order.id !== id));
      message.success('Заказ успешно удален');
    } catch (error) {
      message.error('Ошибка при удалении заказа: ' + error.message);
    }
  };

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
                {order.date && order.date.seconds
                  ? new Date(order.date.seconds * 1000).toLocaleDateString('ru-RU')
                  : 'Дата не указана'}
              </Text>
              {/* Corrected client access */}
              <Text strong style={{ fontSize: 18, marginBottom: 4 }}>{order.client?.brand || 'Клиент не указан'}</Text>
              <Text style={{ display: 'block', color: '#6B7280' }}>{order.client?.companyName || 'Компания не указана'}</Text>
              <Text style={{ display: 'block', marginBottom: 8 }}>{order.product || 'Продукт не указан'}</Text>
              <Text style={{ color: '#1890ff', display: 'block', marginBottom: 8 }}>{order.quantity || '0'} шт</Text>
              {role === 'owner' && order.price !== undefined && (
                <div style={{ textAlign: 'left', marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 18, color: '#000' }}>
                    {(order.quantity * order.price * 1000).toLocaleString('ru-RU')}
                  </Text>
                  <Text style={{ display: 'block', color: '#6B7280', fontSize: 14 }}>
                    {order.price.toLocaleString('ru-RU')} сум/шт
                  </Text>
                </div>
              )}
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
                  checked={role === 'owner' ? order.status === 'delivered' : order.status === 'ready'}
                  onChange={(checked) => {
                    if (role === 'owner') {
                      handleStatusChange(order.id, checked ? 'delivered' : 'in-progress');
                    } else {
                      handleStatusChange(order.id, checked ? 'ready' : 'in-progress');
                    }
                  }}
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: '#68768C' }}>
                  {role === 'owner' 
                    ? (order.status === 'delivered' ? 'Доставлено' : 'Изменить на : Доставлено') 
                    : (order.status === 'ready' ? 'Готов к отгрузке' : 'Изменить на : Готов к отгрузке')}
                </Text>
              </div>
              {/* Delete button for card view */}
              <Popconfirm
                title="Вы уверены, что хотите удалить этот заказ?"
                onConfirm={() => handleDeleteOrder(order.id)}
                okText="Да"
                cancelText="Нет"
              >
                <Button type="link" icon={<DeleteOutlined />} danger>
                  Удалить
                </Button>
              </Popconfirm>
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
        if (record.date && record.date.seconds) {
          return new Date(record.date.seconds * 1000).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        } else {
          return 'Дата отсутствует';
        }
      },
    },
    {
      title: 'КОМПАНИЯ',
      dataIndex: 'client',
      valueType: 'text',
      editable: false,
      render: (_, record) => {
        // Corrected client access
        if (record.client?.brand && record.client?.companyName) {
          return (
            <div style={{ textAlign: 'left' }}>
              <Text style={{ fontSize: 16, fontWeight: 600, color: '#000' }}>
                {record.client.brand}
              </Text>
              <Text style={{ display: 'block', fontWeight: 200, color: '#6B7280' }}>
                {record.client.companyName}
              </Text>
            </div>
          );
        } else {
          return 'Клиент не найден';
        }
      },
    },
    {
      title: 'ПРОДУКТ',
      dataIndex: 'product',
      editable: false,
      render: (_, record) => {
        if (typeof record.product === 'string' && record.product.includes(' > ')) {
          const [mainCategory, subCategory] = record.product.split(' > ');
          return (
            <span>
              <span style={{ fontWeight: 'bold', color: '#1F2A37' }}>{mainCategory}</span> 
              {' > '}
              <span style={{ color: '#6B7280' }}>{subCategory || ''}</span>
            </span>
          );
        } else {
          return record.product || 'Продукт не указан';
        }
      },
    },
    {
      title: 'КОЛИЧЕСТВО',
      dataIndex: 'quantity',
      valueType: 'digit',
      editable: false,
      render: (quantity) => quantity || 'Кол-во не указано',
    },
    ...(role === 'owner' ? [
      {
        title: 'ЦЕНА',
        dataIndex: 'price',
        valueType: 'text',
        editable: false,
        render: (_, record) => {
          if (record.price !== undefined) {
            return (
              <div style={{ textAlign: 'left' }}>
                <Text style={{ fontSize: 16, fontWeight: 600, color: '#000' }}>
                  {(record.quantity * record.price * 1000).toLocaleString('ru-RU')}
                </Text>
                <Text style={{ display: 'block', fontWeight: 200, color: '#6B7280', fontSize: 14 }}>
                  {record.price.toLocaleString('ru-RU')} сум/шт
                </Text>
              </div>
            );
          } else {
            return 'Цена не указана';
          }
        },
      }
    ] : []),
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
        return 'Статус не указан';
      },
    },
    {
      title: 'Действие',
      key: 'action',
      render: (_, record) => (
        <Popconfirm
          title="Вы уверены, что хотите удалить этот заказ?"
          onConfirm={() => handleDeleteOrder(record.id)}
          okText="Да"
          cancelText="Нет"
        >
          <Button type="link" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      ),
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
            editableKeys: [],
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
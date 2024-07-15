import React, { useState } from 'react';
import { EditableProTable } from '@ant-design/pro-components';
import { Select, message, Typography, Badge, Radio, Card, Switch } from 'antd';
import { UnorderedListOutlined, AppstoreOutlined, CodeSandboxOutlined, CarOutlined } from '@ant-design/icons';
import './OrderList.css';

const { Title, Text } = Typography;

const statusOptions = [
  { label: 'В процессе', value: 'in-progress', color: 'orange', backgroundColor: '#E6F4FF', textColor: '#355A77', icon: <CarOutlined /> },
  { label: 'Доставлено', value: 'delivered', color: 'green', backgroundColor: '#E3F6EB', textColor: '#3D8C5C', icon: <CarOutlined /> },
  { label: 'Готов к отправке', value: 'ready', color: 'blue', backgroundColor: '#FDEADC', textColor: '#D8844C', icon: <CodeSandboxOutlined /> },
];

const defaultData = [
  { id: 1, client: 'Les Ailes', product: 'Сахар стик', quantity: 10, price: '1,780,000 сум', status: 'in-progress', date: '2024.02.16' },
  { id: 2, client: 'Chopar', product: 'Сахар сашет', quantity: 20, price: '2,450,000 сум', status: 'delivered', date: '2024.02.16' },
  { id: 3, client: 'Big Burger', product: 'Соль', quantity: 30, price: '3,300,000 сум', status: 'ready', date: '2024.02.16' },
];

const OrderList = () => {
  const [editableKeys, setEditableRowKeys] = useState(() => defaultData.map((item) => item.id));
  const [dataSource, setDataSource] = useState(defaultData);
  const [viewMode, setViewMode] = useState('table');

  const handleSave = async (row) => {
    const newData = [...dataSource];
    const index = newData.findIndex((item) => row.id === item.id);
    if (index > -1) {
      const item = newData[index];
      newData.splice(index, 1, { ...item, ...row });
      setDataSource(newData);
      message.success('Данные успешно сохранены!');
    }
  };

  const handleStatusChange = (id, newStatus) => {
    const newData = dataSource.map(item => (item.id === id ? { ...item, status: newStatus } : item));
    setDataSource(newData);
  };

  const renderCardView = () => (
    <div className="card-container">
      {dataSource.map(order => (
        <Card key={order.id} className="order-card">
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>{order.date}</Text>
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
          recordCreatorProps={false} // This removes the "+" button
        />
      ) : (
        renderCardView()
      )}
    </>
  );
};

export default OrderList;

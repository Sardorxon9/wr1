import React, { useState } from 'react';
import { EditableProTable } from '@ant-design/pro-components';
import { Select, message, Typography, Badge, Radio, Card, Switch, Button } from 'antd';
import { UnorderedListOutlined, AppstoreOutlined } from '@ant-design/icons';
import './OrderList.css';

const { Title, Text } = Typography;

const statusOptions = [
  { label: 'В процессе', value: 'in-progress', color: 'orange' },
  { label: 'Доставлено', value: 'delivered', color: 'green', backgroundColor: '#E3F6EB', textColor: '#3D8C5C' },
  { label: 'Готов к отправке', value: 'ready', color: 'blue' },
];

const defaultData = [
  { id: 1, client: 'Les Ailes', product: 'Сахар стик', quantity: 10, price: '100 сум', status: 'in-progress', date: '2024.02.16' },
  { id: 2, client: 'Chopar', product: 'Сахар сашет', quantity: 20, price: '200 сум', status: 'delivered', date: '2024.02.16' },
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

  const handleStatusChange = (id, status) => {
    const newData = dataSource.map(item => (item.id === id ? { ...item, status } : item));
    setDataSource(newData);
  };

  const renderCardView = () => (
    <div className="card-container">
      {dataSource.map(order => (
        <Card key={order.id} className="order-card" style={{ width: 300, borderRadius: '10px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>{order.date}</Text>
          <Text strong style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{order.client.toUpperCase()}</Text>
          <Text style={{ display: 'block', marginBottom: 8 }}>{order.product}</Text>
          <Text style={{ color: '#1890ff', display: 'block', marginBottom: 8 }}>{order.quantity} шт</Text>
          <Text strong style={{ fontSize: 20, fontWeight: 600, display: 'block', marginBottom: 16 }}>{order.price}</Text>
          <Button type="primary" style={{ backgroundColor: statusOptions.find(option => option.value === order.status).backgroundColor, color: statusOptions.find(option => option.value === order.status).textColor, border: 'none', marginBottom: 16 }}>{statusOptions.find(option => option.value === order.status).label}</Button>
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
              <Badge color={option.color} text={option.label} />
            </Select.Option>
          ))}
        </Select>
      ),
      render: (_, record) => {
        const statusOption = statusOptions.find(option => option.value === record.status);
        if (statusOption && statusOption.value === 'delivered') {
          return <Badge color={statusOption.backgroundColor} text={statusOption.label} style={{ color: statusOption.textColor }} />;
        }
        return statusOption ? <Badge color={statusOption.color} text={statusOption.label} /> : null;
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

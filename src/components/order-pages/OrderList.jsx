import React, { useState } from 'react';
import { EditableProTable } from '@ant-design/pro-components';
import { Select, message, Typography } from 'antd';
import './OrderList.css';

const { Title } = Typography;

const statusOptions = [
  { label: 'В процессе', value: 'in-progress' },
  { label: 'Доставлено', value: 'delivered' },
  { label: 'Готов к отправке', value: 'ready' },
];

const defaultData = [
  { id: 1, client: 'Les Ailes', product: 'Сахар стик', quantity: 10, price: 100, status: 'in-progress' },
  { id: 2, client: 'Chopar', product: 'Сахар сашет', quantity: 20, price: 200, status: 'delivered' },
];

const OrderList = () => {
  const [editableKeys, setEditableRowKeys] = useState(() => defaultData.map((item) => item.id));
  const [dataSource, setDataSource] = useState(defaultData);

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
      valueType: 'money',
      editable: false,
      render: (value) => `${Number(value).toLocaleString()} сум`,
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      valueType: 'select',
      renderFormItem: (_, { record }) => (
        <Select placeholder="Выберите статус" defaultValue={record.status} style={{ width: '100%' }}>
          {statusOptions.map(option => (
            <Select.Option key={option.value} value={option.value}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      ),
      render: (_, record) => {
        const statusOption = statusOptions.find(option => option.value === record.status);
        return statusOption ? statusOption.label : null;
      },
    },
  ];

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

  return (
    <>
      <Title level={2}>Заказы</Title>
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
    </>
  );
};

export default OrderList;

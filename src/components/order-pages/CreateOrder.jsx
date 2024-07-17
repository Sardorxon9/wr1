import React, { useState } from 'react';
import { Form, Input, Button, DatePicker, Select, InputNumber, Radio, Typography, Space, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import './CreateOrder.css';
import { useOutletContext } from 'react-router-dom';
import { auth, db } from "../login-signUp/firebase";
import { setDoc, doc } from "firebase/firestore";
import moment from 'moment';

const { Title, Text } = Typography;

const CreateOrder = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [orderPreview, setOrderPreview] = useState({
    client: '',
    product: '',
    quantity: 1,
    price: 0,
  });

  const onValuesChange = (_, allValues) => {
    setOrderPreview(allValues);
  };

  const onFinish = async (values) => {
    try {
      const orderId = `order_${new Date().getTime()}`; 
      const orderData = {
        ...values,
        date: values.date.toDate(),
        total: values.quantity * values.price,
        email: auth.currentUser.email,
      };
      await setDoc(doc(db, "orders", orderId), orderData);
      messageApi.open({
        type: 'success',
        content: 'Заказ успешно добавлен!',
      });
      form.resetFields();
      setOrderPreview({ client: '', product: '', quantity: 1, price: 0 });
    } catch (error) {
      messageApi.open({
        type: 'error',
        content: 'Ошибк: ' + error.message,
      });
    }
  };

  return (
    <div className="create-order-container">
      {contextHolder}
      <div className="order-header">
        <div className="header-content-page">
          <Title level={3}>Добавить новый заказ</Title>
          <Text>Заказ номер: 24A001</Text>
        </div>
      </div>
      <Form
        layout="vertical"
        form={form}
        onValuesChange={onValuesChange}
        onFinish={onFinish}
        initialValues={{ quantity: 1, price: 0, status: 'in-progress' }}
      >
        <Space size="large" direction="vertical" style={{ width: '100%' }}>
          <div className="form-row">
            <Form.Item name="date" label="Дата" rules={[{ required: true, message: 'Пожалуйста, выберите дату!' }]}>
              <DatePicker placeholder="Выберите дату" />
            </Form.Item>
            <Form.Item name="client" label="Клиент" rules={[{ required: true, message: 'Пожалуйста, выберите клиента!' }]}>
              <Select placeholder="Выберите клиента">
                <Select.Option value="Les Ailes">Les Ailes</Select.Option>
                <Select.Option value="Chopar">Chopar</Select.Option>
                <Select.Option value="Big Burger">Big Burger</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="product" label="Продукт" rules={[{ required: true, message: 'Пожалуйста, выберите продукт!' }]}>
              <Select placeholder="Выберите продукт">
                <Select.Option value="Сахар стик">Сахар стик</Select.Option>
                <Select.Option value="сахар сашет">сахар сашет</Select.Option>
                <Select.Option value="соль">соль</Select.Option>
              </Select>
            </Form.Item>
          </div>
          <div className="form-row">
            <Form.Item name="quantity" label="Количество" rules={[{ required: true, message: 'Пожалуйста, введите количество!' }]}>
              <InputNumber min={1} defaultValue={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="price" label="Цена" rules={[{ required: true, message: 'Пожалуйста, введите цену!' }]}>
              <InputNumber min={0} defaultValue={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="status" label="Статус" rules={[{ required: true, message: 'Пожалуйста, выберите статус!' }]}>
              <Radio.Group>
                <Radio value="in-progress">В процессе</Radio>
                <Radio value="delivered">Доставлено</Radio>
                <Radio value="ready">Готов к отправке</Radio>
              </Radio.Group>
            </Form.Item>
          </div>
          <div className="order-preview">
            <div className="order-summary">
              <div><Text strong>Клиент:</Text> {orderPreview.client}</div>
              <div><Text strong>Продукт:</Text> {orderPreview.product}</div>
              <div><Text strong>Количество:</Text> {orderPreview.quantity}</div>
              <div><Text strong>Цена:</Text> {orderPreview.price} сум</div>
              <div className="order-total"><Text strong>Итого:</Text> {(orderPreview.quantity * orderPreview.price).toLocaleString()} сум</div>
            </div>
          </div>
          <div className="form-actions">
            <Button type="default">Отмена</Button>
            <Button type="primary" htmlType="submit">Добавить новый заказ</Button>
          </div>
        </Space>
      </Form>
    </div>
  );
};

export default CreateOrder;

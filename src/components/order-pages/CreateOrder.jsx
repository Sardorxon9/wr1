import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Radio, Typography, Space, message, Cascader, Select } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import './CreateOrder.css';
import { auth, db } from "../login-signUp/firebase";
import { setDoc, doc, getDoc, collection, getDocs } from "firebase/firestore";

const { Title, Text } = Typography;

const CreateOrder = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [orderPreview, setOrderPreview] = useState({
    client: '',
    product: [],
    quantity: 1,
    price: 0,
  });
  const [organizationID, setOrganizationID] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cascaderOptions, setCascaderOptions] = useState([]);

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

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchProductsCategoriesCustomers = async () => {
      if (organizationID) {
        const productsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/products`));
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);

        const categoriesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/product-categories`));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategories(categoriesData);

        const options = categoriesData.map(category => ({
          value: category.name,
          label: category.name,
          children: productsData.filter(product => product.category === category.name).map(product => ({
            value: product.title,
            label: product.title,
          })),
        }));

        setCascaderOptions(options);

        const customersSnapshot = await getDocs(collection(db, `organizations/${organizationID}/customers`));
        const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomers(customersData);
      }
    };

    fetchProductsCategoriesCustomers();
  }, [organizationID]);

  const onValuesChange = (_, allValues) => {
    const selectedCustomer = customers.find(customer => customer.companyName === allValues.client);
    if (selectedCustomer) {
      form.setFieldsValue({
        product: selectedCustomer.product ? selectedCustomer.product.split(' > ') : [],
        price: selectedCustomer.price || 0,
      });
    }
    setOrderPreview(allValues);
  };

  const onFinish = async (values) => {
    try {
      const orderId = `order_${new Date().getTime()}`;
      const quantityMultiplier = 1000;
      const total = values.quantity * values.price * quantityMultiplier;
      const orderData = {
        ...values,
        date: values.date.toDate(),
        product: values.product ? values.product.join(' > ') : '',
        total: total,
        email: auth.currentUser.email,
      };
      await setDoc(doc(db, `organizations/${organizationID}/orders`, orderId), orderData);
      messageApi.open({
        type: 'success',
        content: 'Заказ успешно добавлен!',
      });
      form.resetFields();
      setOrderPreview({ client: '', product: [], quantity: 1, price: 0 });
    } catch (error) {
      messageApi.open({
        type: 'error',
        content: 'Ошибка: ' + error.message,
      });
    }
  };

  const formatNumber = (number) => {
    return number.toLocaleString('ru-RU');
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
                {customers.map(customer => (
                  <Select.Option key={customer.id} value={customer.companyName}>
                    {customer.companyName}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="product" label="Продукт" rules={[{ required: true, message: 'Пожалуйста, выберите продукт!' }]}>
              <Cascader options={cascaderOptions} placeholder="Выберите продукт" />
            </Form.Item>
          </div>
          <div className="form-row">
            <Form.Item name="quantity" label="Количество" rules={[{ required: true, message: 'Пожалуйста, введите количество!' }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="price" label="Цена" rules={[{ required: true, message: 'Пожалуйста, введите цену!' }]}>
              <InputNumber min={0} style={{ width: '100%' }} />
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
              <div><Text strong>Продукт:</Text> {Array.isArray(orderPreview.product) ? orderPreview.product.join(' > ') : ''}</div>
              <div><Text strong>Количество:</Text> {orderPreview.quantity}</div>
              <div><Text strong>Цена:</Text> {formatNumber(orderPreview.price)} сум</div>
              <div className="order-total"><Text strong>Итого:</Text> {formatNumber(orderPreview.quantity * orderPreview.price * 1000)} сум</div>
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

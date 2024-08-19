import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Typography } from 'antd';
import { collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

// Custom Telegram Icon using SVG
const TelegramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 496 512" width="16" height="16" fill="#0088cc">
    <path d="M248,8C111.033,8,0,119.033,0,256S111.033,504,248,504,496,392.967,496,256,384.967,8,248,8Zm114.6,149.65L364.438,370.678c-3.942,17.515-14.336,21.877-29.02,13.632l-80.12-59.022-38.637,37.232c-4.26,4.261-7.824,7.826-16.021,7.826l5.755-81.248,147.954-133.716c6.427-5.755-1.395-8.971-9.975-3.215l-182.942,115.51-78.721-24.548c-17.131-5.322-17.48-17.131,3.63-25.377L355.948,141.8C367.977,137.414,376.686,144.455,362.6,157.65Z"/>
  </svg>
);

const { Title } = Typography;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const { organizationID } = useOutletContext();
  const [products, setProducts] = useState([]);
  const [cascaderOptions, setCascaderOptions] = useState([]);

  useEffect(() => {
    const fetchProductsAndCategories = async () => {
      if (organizationID) {
        const productsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/products`));
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);

        const categoriesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/product-categories`));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const options = categoriesData.map(category => ({
          value: category.name,
          label: category.name,
          children: productsData.filter(product => product.category === category.name).map(product => ({
            value: product.title,
            label: product.title,
          })),
        }));

        setCascaderOptions(options);
      }
    };

    const fetchCustomers = async () => {
      const customersSnapshot = await getDocs(collection(db, `organizations/${organizationID}/customers`));
      const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(customersData);
    };

    if (organizationID) {
      fetchProductsAndCategories();
      fetchCustomers();
    }
  }, [organizationID]);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const generateToken = () => {
    // Generate a random 10-character alphanumeric code
    return Math.random().toString(36).substring(2, 12).toUpperCase();
  };

  const handleAddCustomer = async (values) => {
    try {
      // Generate a unique token for the customer
      const token = generateToken();
  
      // Create a document ID for the customer in the customers collection
      const customerDocRef = doc(collection(db, `organizations/${organizationID}/customers`));
      const userID = customerDocRef.id; // This will be used as the ID for the customer's record
  
      // Process the Telegram ID to save both the URL and the ID
      const telegramID = values.telegramID;
      const customerData = {
        ...values,
        telegram_url: `https://t.me/${telegramID}`,
        telegram_id: telegramID,
        token,  // Include the generated token
        organizationID,
        userID  // Store the generated user ID
      };
  
      // Add the customer to the 'customers' collection
      await setDoc(customerDocRef, customerData);
  
      // Add the customer to the 'tg_tokens/customer_tokens' collection
      await setDoc(doc(db, `tg_tokens/customer_tokens`, userID), customerData);
  
      message.success('Клиент успешно добавлен!');
      setIsModalVisible(false);
      form.resetFields();
  
      // Refresh customers list
      const customersSnapshot = await getDocs(collection(db, `organizations/${organizationID}/customers`));
      const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCustomers(customersData);
    } catch (error) {
      message.error('Ошибка при добавлении клиента: ' + error.message);
    }
  };
  

  const formatPhoneNumber = (phone) => {
    // Format phone number with spaces
    return phone.replace(/(\d{3})(\d{2})(\d{3})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  };

  const columns = [
    {
      title: 'Компания',
      dataIndex: 'companyName',
      key: 'companyName',
    },
    {
      title: 'Продукт',
      dataIndex: 'product',
      key: 'product',
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      render: (price) => `${price} сум`,
    },
    {
      title: 'Контактное лицо',
      dataIndex: 'personInCharge',
      key: 'personInCharge',
    },
    {
      title: 'Телефон',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => formatPhoneNumber(phone), // Format the phone number in the table
    },
    {
      title: 'Telegram ID',
      dataIndex: 'telegram_id',
      key: 'telegram_id',
    },
  ];

  return (
    <div>
      <Title level={2}>Клиенты</Title>
      <Button type="primary" onClick={showModal} style={{ marginBottom: 20 }}>
        Добавить нового клиента
      </Button>
      <Table dataSource={customers} columns={columns} rowKey="id" />

      <Modal
        title="Добавить нового клиента"
        visible={isModalVisible}
        onCancel={handleCancel}
        onOk={form.submit}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" onFinish={handleAddCustomer}>
          <Form.Item name="companyName" label="Название компании" rules={[{ required: true, message: 'Пожалуйста, введите название компании!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="product" label="Продукт" rules={[{ required: true, message: 'Пожалуйста, выберите продукт!' }]}>
            <Select placeholder="Выберите продукт">
              {cascaderOptions.flatMap(category =>
                category.children.map(product => (
                  <Select.Option key={product.value} value={`${category.label} > ${product.label}`}>
                    {category.label}  {product.label}
                  </Select.Option>
                ))
              )}
            </Select>
          </Form.Item>
          <Form.Item name="price" label="Цена" rules={[{ required: true, message: 'Пожалуйста, введите цену!' }]}>
            <InputNumber min={0} style={{ width: '100%' }} addonAfter="сум" />
          </Form.Item>
          <Form.Item name="personInCharge" label="Контактное лицо" rules={[{ required: true, message: 'Пожалуйста, введите имя контактного лица!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Телефон" rules={[{ required: true, message: 'Пожалуйста, введите номер телефона!' }]}>
            <PhoneInput
              country={'uz'}
              onlyCountries={['uz']}
              countryCodeEditable={false}
              placeholder="Введите номер телефона"
              inputStyle={{ width: '100%' }}
              containerStyle={{ width: '100%' }}
              inputProps={{
                required: true,
                autoFocus: true,
              }}
            />
          </Form.Item>
          <Form.Item name="telegramID" label="Telegram ID" rules={[{ required: true, message: 'Пожалуйста, введите Telegram ID!' }]}>
            <Input
              addonBefore={
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <TelegramIcon />
                  <span style={{ marginLeft: '5px' }}>tg.me/</span>
                </div>
              }
              placeholder="Введите Telegram ID"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Customers;

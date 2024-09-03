import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Select, message, Typography } from 'antd';
import { collection, addDoc, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';



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
        
        </Form>
      </Modal>
    </div>
  );
};

export default Customers;

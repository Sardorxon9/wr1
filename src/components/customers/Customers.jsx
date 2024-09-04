import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Cascader, message, Typography, Empty } from 'antd';
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const { Title } = Typography;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cascaderOptions, setCascaderOptions] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const { organizationID } = useOutletContext();

  useEffect(() => {
    const fetchProductsCategoriesAndCustomers = async () => {
      if (organizationID) {
        try {
          // Fetch products
          const productsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/products`));
          const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setProducts(productsData);

          // Fetch categories
          const categoriesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/product-categories`));
          const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCategories(categoriesData);

          // Prepare Cascader options
          const options = categoriesData.map(category => ({
            value: category.name,
            label: category.name,
            children: productsData.filter(product => product.category === category.name).map(product => ({
              value: product.title,
              label: product.title,
            })),
          }));
          setCascaderOptions(options);

          // Fetch customers
          const customersSnapshot = await getDocs(collection(db, `organizations/${organizationID}/customers`));
          const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setCustomers(customersData);
        } catch (error) {
          message.error('Ошибка при загрузке данных: ' + error.message);
        }
      }
      setLoading(false);
    };

    fetchProductsCategoriesAndCustomers();
  }, [organizationID]);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const handleAddCustomer = async (values) => {
    try {
      await addDoc(collection(db, `organizations/${organizationID}/customers`), values);
      message.success('Клиент успешно добавлен!');
      setIsModalVisible(false);
      form.resetFields();
      setCustomers([...customers, values]);
    } catch (error) {
      message.error('Ошибка при добавлении клиента: ' + error.message);
    }
  };

  const columns = [
    {
      title: 'Компания',
      dataIndex: 'companyName',
      key: 'companyName',
    },
    {
      title: 'Бренд',
      dataIndex: 'brand',
      key: 'brand',
    },
    {
      title: 'Контактное лицо',
      dataIndex: 'personInCharge',
      key: 'personInCharge',
    },
    {
      title: 'Продукт',
      dataIndex: 'product',
      key: 'product',
    },
    {
      title: 'Цена (сум)',
      dataIndex: 'price',
      key: 'price',
    },
  ];

  return (
    <div>
      <Title level={2}>Клиенты</Title>
      {customers.length === 0 && !loading ? (
        <Empty description={<span>Клиенты не зарегистрированы. Пожалуйста, нажмите кнопку ниже, чтобы начать регистрацию клиентов.</span>} />
      ) : (
        <Table dataSource={customers} columns={columns} rowKey="id" loading={loading} />
      )}
      <Button type="primary" onClick={showModal} style={{ marginBottom: 20 }}>
        Добавить нового клиента
      </Button>

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
          <Form.Item name="brand" label="Бренд" rules={[{ required: true, message: 'Пожалуйста, введите бренд!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="personInCharge" label="Контактное лицо" rules={[{ required: true, message: 'Пожалуйста, введите имя контактного лица!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="product" label="Продукт" rules={[{ required: true, message: 'Пожалуйста, выберите продукт!' }]}>
            <Cascader options={cascaderOptions} placeholder="Выберите продукт" />
          </Form.Item>
          <Form.Item name="price" label="Цена (сум)" rules={[{ required: true, message: 'Пожалуйста, введите цену!' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
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

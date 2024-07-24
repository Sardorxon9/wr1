import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Modal, Form, Input, Select, message, Tabs, Row, Col, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { collection, getDocs, addDoc, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../login-signUp/firebase';
import './Products.css';

const { Title } = Typography;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [organizationID, setOrganizationID] = useState('');
  const [activeTabKey, setActiveTabKey] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'owner-users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setOrganizationID(userDocSnap.data().organizationID);
        }
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchProductsAndCategories = async () => {
      if (organizationID) {
        const productsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/products`));
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);

        const categoriesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/product-categories`));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategories(categoriesData);
        if (categoriesData.length > 0) {
          setActiveTabKey(categoriesData[0].name); // Select the first category by default
        }
      }
    };

    fetchProductsAndCategories();
  }, [organizationID]);

  const handleAddProduct = async (values) => {
    try {
      await addDoc(collection(db, `organizations/${organizationID}/products`), values);
      message.success('Продукт успешно добавлен');
      form.resetFields();
      setIsModalVisible(false);
      setProducts([...products, values]);
    } catch (error) {
      message.error('Ошибка при добавлении продукта: ' + error.message);
    }
  };

  const handleAddCategory = async (values) => {
    try {
      await addDoc(collection(db, `organizations/${organizationID}/product-categories`), values);
      message.success('Категория успешно добавлена');
      categoryForm.resetFields();
      setIsCategoryModalVisible(false);
      const newCategories = [...categories, values];
      setCategories(newCategories);
      setActiveTabKey(values.name); // Select the new category
    } catch (error) {
      message.error('Ошибка при добавлении категории: ' + error.message);
    }
  };

  const renderProducts = (category) => {
    const filteredProducts = products.filter(product => product.category === category);
    return (
      <Row gutter={[16, 16]}>
        {filteredProducts.map(product => (
          <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
            <Card title={product.title}>
              <p>Категория: {product.category}</p>
              <p>Цена: {product.price}</p>
              <p>Сырье: {product.material}</p>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  return (
    <div>
      <Title level={2}>Продукты</Title>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Добавить новый продукт
        </Button>
        <Button type="default" icon={<PlusOutlined />} onClick={() => setIsCategoryModalVisible(true)}>
          Добавить категорию
        </Button>
      </Space>
      <Tabs activeKey={activeTabKey} onChange={setActiveTabKey}>
        {categories.map(category => (
          <Tabs.TabPane tab={category.name} key={category.name}>
            {renderProducts(category.name)}
          </Tabs.TabPane>
        ))}
      </Tabs>

      <Modal title="Добавить новый продукт" visible={isModalVisible} onCancel={() => setIsModalVisible(false)} footer={null}>
        <Form form={form} onFinish={handleAddProduct}>
          <Form.Item name="title" label="Название" rules={[{ required: true, message: 'Пожалуйста, введите название продукта!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Категория" rules={[{ required: true, message: 'Пожалуйста, выберите категорию!' }]}>
            <Select>
              {categories.map(category => (
                <Select.Option key={category.id} value={category.name}>
                  {category.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="price" label="Цена" rules={[{ required: true, message: 'Пожалуйста, введите цену продукта!' }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="material" label="Сырье" rules={[{ required: true, message: 'Пожалуйста, введите сырье продукта!' }]}>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Добавить</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Добавить новую категорию" visible={isCategoryModalVisible} onCancel={() => setIsCategoryModalVisible(false)} footer={null}>
        <Form form={categoryForm} onFinish={handleAddCategory}>
          <Form.Item name="name" label="Название категории" rules={[{ required: true, message: 'Пожалуйста, введите название категории!' }]}>
            <Input />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Добавить</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;

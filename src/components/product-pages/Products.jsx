import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Modal, Form, Input, Select, message, Tabs, Row, Col, Space, Spin } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { collection, getDocs, addDoc, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../login-signUp/firebase';
import './Products.css';

const { Title, Text } = Typography;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isManageCategoriesModalVisible, setIsManageCategoriesModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [organizationID, setOrganizationID] = useState('');
  const [activeTabKey, setActiveTabKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [categoryChanges, setCategoryChanges] = useState({});

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchProductsAndCategories = async () => {
      if (organizationID) {
        setLoading(true);
        const productsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/products`));
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(productsData);

        const categoriesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/product-categories`));
        const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCategories(categoriesData);
        if (categoriesData.length > 0) {
          setActiveTabKey(categoriesData[0].id); // Use unique ID for tabs
        }
        setLoading(false);
      }
    };

    fetchProductsAndCategories();
  }, [organizationID]);

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
      const categoryRef = await addDoc(collection(db, `organizations/${organizationID}/product-categories`), values);
      message.success('Категория успешно добавлена');
      categoryForm.resetFields();
      setIsCategoryModalVisible(false);
      const newCategories = [...categories, { id: categoryRef.id, ...values }];
      setCategories(newCategories);
      setActiveTabKey(categoryRef.id); // Select the new category
    } catch (error) {
      message.error('Ошибка при добавлении категории: ' + error.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await deleteDoc(doc(db, `organizations/${organizationID}/product-categories`, categoryId));
      message.success('Категория успешно удалена');
      setCategories(categories.filter(category => category.id !== categoryId));
      // Optionally update active tab if needed
    } catch (error) {
      message.error('Ошибка при удалении категории: ' + error.message);
    }
  };

  const handleCategoryNameChange = (categoryId, newName) => {
    setCategoryChanges({ ...categoryChanges, [categoryId]: newName });
  };

  const handleSaveCategoryChanges = async () => {
    const updates = Object.keys(categoryChanges).map(async (categoryId) => {
      const newName = categoryChanges[categoryId];
      return updateDoc(doc(db, `organizations/${organizationID}/product-categories`, categoryId), {
        name: newName
      });
    });

    try {
      await Promise.all(updates);
      message.success('Изменения успешно сохранены');
      setCategories(categories.map(category => ({
        ...category,
        name: categoryChanges[category.id] || category.name,
      })));
      setCategoryChanges({});
    } catch (error) {
      message.error('Ошибка при сохранении изменений: ' + error.message);
    }

    setIsManageCategoriesModalVisible(false);
  };

  const renderProducts = (category) => {
    const filteredProducts = products.filter(product => product.category === category);
    if (filteredProducts.length === 0) {
      return <Text type="secondary">Продукты еще не добавлены</Text>; // Display message if no products are available
    }
    return (
      <Row gutter={[16, 16]}>
        {filteredProducts.map(product => (
          <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
            <Card
              title={product.title}
              actions={[
                <EditOutlined key="edit" onClick={() => { /* Handle edit */ }} />,
                <DeleteOutlined key="delete" onClick={() => { /* Handle delete */ }} />,
              ]}
            >
              <p>Категория: {product.category}</p>
              <p>Цена: {product.price} сум</p>
              <p>Сырье: {product.material}</p>
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const categoryItems = categories.map(category => ({
    key: category.id,
    label: category.name,
    children: renderProducts(category.name),
  }));

  return (
    <div>
      <Title level={2}>Продукты</Title>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Добавить новый продукт
        </Button>
        <Button type="default" onClick={() => setIsCategoryModalVisible(true)}>
          Добавить категорию
        </Button>
        <Button type="default" onClick={() => setIsManageCategoriesModalVisible(true)}>
          Управление категориями
        </Button>
      </Space>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin size="large" />
        </div>
      ) : (
        <Tabs activeKey={activeTabKey} onChange={setActiveTabKey} items={categoryItems} />
      )}

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

      <Modal
        title="Управление категориями"
        visible={isManageCategoriesModalVisible}
        onCancel={() => setIsManageCategoriesModalVisible(false)}
        footer={null}
      >
        {categories.map(category => (
          <div key={category.id} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Input
              value={categoryChanges[category.id] || category.name}
              onChange={(e) => handleCategoryNameChange(category.id, e.target.value)}
              style={{ flex: 1 }}
            />
            <Button
              type="link"
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteCategory(category.id)}
              style={{ color: 'red' }}
            />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
          <Button onClick={() => setIsManageCategoriesModalVisible(false)}>Cancel</Button>
          <Button type="primary" onClick={handleSaveCategoryChanges}>Save</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Products;

import React, { useState, useEffect } from 'react';
import { Card, Typography, Button, Modal, Form, Input, Select, message, Tabs, Row, Col, Space, Spin, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../login-signUp/firebase';
import './Products.css';

const { Title, Text } = Typography;
const { confirm } = Modal;

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isManageCategoriesModalVisible, setIsManageCategoriesModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [manageCategoriesForm] = Form.useForm();
  const [organizationID, setOrganizationID] = useState('');
  const [activeTabKey, setActiveTabKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentProduct, setCurrentProduct] = useState(null); // To store product being edited

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

  const handleEditProduct = async (values) => {
    try {
      if (currentProduct) {
        await updateDoc(doc(db, `organizations/${organizationID}/products`, currentProduct.id), values);
        message.success('Продукт успешно обновлен');
        setIsEditModalVisible(false);
        setProducts(products.map(product => (product.id === currentProduct.id ? { ...product, ...values } : product)));
        setCurrentProduct(null);
      }
    } catch (error) {
      message.error('Ошибка при обновлении продукта: ' + error.message);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      await deleteDoc(doc(db, `organizations/${organizationID}/products`, productId));
      message.success('Продукт успешно удален');
      setProducts(products.filter(product => product.id !== productId));
    } catch (error) {
      message.error('Ошибка при удалении продукта: ' + error.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await deleteDoc(doc(db, `organizations/${organizationID}/product-categories`, categoryId));
      message.success('Категория успешно удалена');
      setCategories(categories.filter(category => category.id !== categoryId));
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

  const showDeleteConfirm = (productId) => {
    confirm({
      title: 'Вы уверены, что хотите удалить этот продукт?',
      icon: <ExclamationCircleOutlined />,
      content: 'Это действие нельзя будет отменить.',
      okText: 'Да',
      okType: 'danger',
      cancelText: 'Нет',
      onOk() {
        handleDeleteProduct(productId);
      },
    });
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
              loading={loading}
              actions={[
                <EditOutlined key="edit" onClick={() => {
                  setCurrentProduct(product);
                  setIsEditModalVisible(true);
                  form.setFieldsValue(product); // Set form fields with product values
                }} />,
                <DeleteOutlined key="delete" onClick={() => showDeleteConfirm(product.id)} />
              ]}
            >
              <Card.Meta
                title={product.title}
                description={
                  <>
                    <p>Категория: {product.category}</p>
                    <p>Цена: {product.price} сум</p>
                    <p>Сырье: {product.material}</p>
                  </>
                }
              />
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
        <Button type="default" icon={<PlusOutlined />} onClick={() => setIsCategoryModalVisible(true)}>
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

      <Modal title="Изменить данные продукта" visible={isEditModalVisible} onCancel={() => setIsEditModalVisible(false)} footer={null}>
        <Form form={form} onFinish={handleEditProduct}>
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
            <Button type="primary" htmlType="submit">Сохранить</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Управление категориями"
        visible={isManageCategoriesModalVisible}
        onCancel={() => setIsManageCategoriesModalVisible(false)}
        footer={null}
      >
        <Form form={manageCategoriesForm}>
          {categories.map(category => (
            <Space key={category.id} style={{ display: 'flex', marginBottom: 8 }} align="start">
              <Form.Item style={{ flex: 1, marginBottom: 0 }}>
                <Input defaultValue={category.name} onChange={(e) => handleCategoryNameChange(category.id, e.target.value)} />
              </Form.Item>
              <Button type="text" icon={<DeleteOutlined />} onClick={() => handleDeleteCategory(category.id)} danger />
            </Space>
          ))}
        </Form>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="default" onClick={() => setIsManageCategoriesModalVisible(false)} style={{ marginRight: 8 }}>Отмена</Button>
          <Button type="primary" onClick={handleSaveCategoryChanges}>Сохранить</Button>
        </div>
      </Modal>
    </div>
  );
};

export default Products;

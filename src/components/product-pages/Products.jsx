import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, message, Select } from 'antd';
import { collection, addDoc, getDocs } from "firebase/firestore";
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]); // Fetch material types
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const { organizationID } = useOutletContext();

  useEffect(() => {
    const fetchProductsCategoriesAndMaterialTypes = async () => {
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

          // Fetch material types (for paper management)
          const materialTypesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/material-types`));
          const materialTypesData = materialTypesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setMaterialTypes(materialTypesData);
        } catch (error) {
          message.error('Ошибка при загрузке данных: ' + error.message);
        }
      }
    };

    fetchProductsCategoriesAndMaterialTypes();
  }, [organizationID]);

  const showProductModal = () => {
    setIsProductModalVisible(true);
  };

  const showCategoryModal = () => {
    setIsCategoryModalVisible(true);
  };

  const handleProductCancel = () => {
    setIsProductModalVisible(false);
  };

  const handleCategoryCancel = () => {
    setIsCategoryModalVisible(false);
  };

  const handleAddProduct = async (values) => {
    try {
      await addDoc(collection(db, `organizations/${organizationID}/products`), values);
      message.success('Продукт успешно добавлен!');
      setIsProductModalVisible(false);
      form.resetFields();
      // Refresh products list
      const productsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/products`));
      const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
    } catch (error) {
      message.error('Ошибка при добавлении продукта: ' + error.message);
    }
  };

  const handleAddCategory = async (values) => {
    try {
      await addDoc(collection(db, `organizations/${organizationID}/product-categories`), values);
      message.success('Категория успешно добавлена!');
      setIsCategoryModalVisible(false);
      categoryForm.resetFields();
      // Refresh categories list
      const categoriesSnapshot = await getDocs(collection(db, `organizations/${organizationID}/product-categories`));
      const categoriesData = categoriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCategories(categoriesData);
    } catch (error) {
      message.error('Ошибка при добавлении категории: ' + error.message);
    }
  };

  const productColumns = [
    {
      title: 'Название продукта',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: 'Категория',
      dataIndex: 'category',
      key: 'category',
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      render: (price) => `${price} сум`,
    },
    {
      title: 'Сырье',
      dataIndex: 'material',
      key: 'material',
    },
    {
      title: 'Расход сырья (грамм)',
      dataIndex: 'materialUsage',
      key: 'materialUsage',
      render: (materialUsage) => `${materialUsage} гр`,
    },
    {
      title: 'Бумага, необходимая для производства (гр)',
      dataIndex: 'requiredPaper',
      key: 'requiredPaper',
      render: (requiredPaper) => `${requiredPaper} гр`,
    },
  ];

  return (
    <div>
      <Button type="primary" onClick={showProductModal} style={{ marginBottom: 20 }}>
        Добавить новый продукт
      </Button>
      <Button type="default" onClick={showCategoryModal} style={{ marginBottom: 20, marginLeft: 10 }}>
        Добавить новую категорию
      </Button>
      <Table dataSource={products} columns={productColumns} rowKey="id" />

      <Modal
        title="Добавить новый продукт"
        visible={isProductModalVisible}
        onCancel={handleProductCancel}
        onOk={form.submit}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" onFinish={handleAddProduct}>
          <Form.Item name="title" label="Название продукта" rules={[{ required: true, message: 'Пожалуйста, введите название продукта!' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="Категория" rules={[{ required: true, message: 'Пожалуйста, выберите категорию!' }]}>
            <Select placeholder="Выберите категорию">
              {categories.map(category => (
                <Select.Option key={category.id} value={category.name}>
                  {category.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="price" label="Цена" rules={[{ required: true, message: 'Пожалуйста, введите цену!' }]}>
            <Input addonAfter="сум" />
          </Form.Item>
          <Form.Item name="material" label="Сырье" rules={[{ required: true, message: 'Пожалуйста, выберите сырье!' }]}>
            <Select placeholder="Выберите сырье">
              {materialTypes.map(materialType => (
                <Select.Option key={materialType.id} value={materialType.name}>
                  {materialType.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="materialUsage" label="Расход сырья за 1 шт. (грамм)" rules={[{ required: true, message: 'Пожалуйста, введите расход сырья за 1 ед.' }]}>
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          {/* New Field for Paper Required */}
          <Form.Item
            name="requiredPaper"
            label="Бумага, необходимая для производства 1,000 шт (в гр)"
            rules={[{ required: true, message: 'Пожалуйста, введите количество бумаги, необходимой для производства 1,000 шт (в гр)' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Добавить новую категорию"
        visible={isCategoryModalVisible}
        onCancel={handleCategoryCancel}
        onOk={categoryForm.submit}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={categoryForm} layout="vertical" onFinish={handleAddCategory}>
          <Form.Item name="name" label="Название категории" rules={[{ required: true, message: 'Пожалуйста, введите название категории!' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Products;

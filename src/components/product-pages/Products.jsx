import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  message,
  Select,
  Tabs,
  Space,
} from 'antd';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
  query,
  limit,
} from 'firebase/firestore';
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';
import {
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [materialTypes, setMaterialTypes] = useState([]); // Fetch material types
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isCategorySettingsModalVisible, setIsCategorySettingsModalVisible] =
    useState(false);
  const [isEditMode, setIsEditMode] = useState(false); // New state for edit mode
  const [editingProduct, setEditingProduct] = useState(null); // Product being edited
  const [form] = Form.useForm();
  const [categoryForm] = Form.useForm();
  const [activeTabKey, setActiveTabKey] = useState('all'); // Default selected tab
  const [categoriesForEditing, setCategoriesForEditing] = useState([]);
  const { organizationID } = useOutletContext();

  useEffect(() => {
    const fetchProductsCategoriesAndMaterialTypes = async () => {
      if (organizationID) {
        try {
          // Fetch categories first
          const categoriesSnapshot = await getDocs(
            collection(db, `organizations/${organizationID}/product-categories`)
          );
          const categoriesData = categoriesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setCategories(categoriesData);

          // Fetch products
          const productsSnapshot = await getDocs(
            collection(db, `organizations/${organizationID}/products`)
          );
          const productsData = productsSnapshot.docs.map((doc) => {
            const data = doc.data();

            // If product has categoryId and categoryName, use them
            // Else, try to find categoryId and categoryName from category name
            if (!data.categoryId) {
              const matchingCategory = categoriesData.find(
                (category) => category.name === data.category
              );
              if (matchingCategory) {
                data.categoryId = matchingCategory.id;
                data.categoryName = matchingCategory.name;
              } else {
                data.categoryName = data.category || '';
              }
            }

            return { id: doc.id, ...data };
          });
          setProducts(productsData);

          // Fetch material types (for paper management)
          const materialTypesSnapshot = await getDocs(
            collection(db, `organizations/${organizationID}/material-types`)
          );
          const materialTypesData = materialTypesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setMaterialTypes(materialTypesData);
        } catch (error) {
          message.error('Ошибка при загрузке данных: ' + error.message);
        }
      }
    };

    fetchProductsCategoriesAndMaterialTypes();
  }, [organizationID]);

  const showProductModal = () => {
    setIsEditMode(false);
    setIsProductModalVisible(true);
    form.resetFields();
  };

  const showCategoryModal = () => {
    setIsCategoryModalVisible(true);
  };

  const showCategorySettingsModal = () => {
    setCategoriesForEditing(
      categories.map((category) => ({ ...category, isEditing: false }))
    );
    setIsCategorySettingsModalVisible(true);
  };

  const handleProductCancel = () => {
    setIsProductModalVisible(false);
    setEditingProduct(null);
    form.resetFields();
  };

  const handleCategoryCancel = () => {
    setIsCategoryModalVisible(false);
    categoryForm.resetFields();
  };

  const handleCategorySettingsCancel = () => {
    setIsCategorySettingsModalVisible(false);
  };

  const handleAddProduct = async (values) => {
    try {
      const selectedCategory = categories.find(
        (category) => category.id === values.categoryId
      );
      const productData = {
        title: values.title,
        categoryId: values.categoryId,
        categoryName: selectedCategory ? selectedCategory.name : '',
        price: values.price,
        material: values.material,
        materialUsage: values.materialUsage,
        requiredPaper: values.requiredPaper,
      };

      if (isEditMode && editingProduct) {
        // Update existing product
        await updateDoc(
          doc(db, `organizations/${organizationID}/products`, editingProduct.id),
          productData
        );
        message.success('Продукт успешно обновлен!');
      } else {
        // Add new product
        await addDoc(
          collection(db, `organizations/${organizationID}/products`),
          productData
        );
        message.success('Продукт успешно добавлен!');
      }

      setIsProductModalVisible(false);
      setEditingProduct(null);
      form.resetFields();

      // Refresh products list
      const productsSnapshot = await getDocs(
        collection(db, `organizations/${organizationID}/products`)
      );
      const productsData = productsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return { id: doc.id, ...data };
      });
      setProducts(productsData);
    } catch (error) {
      message.error('Ошибка при сохранении продукта: ' + error.message);
    }
  };

  const handleAddCategory = async (values) => {
    try {
      await addDoc(
        collection(db, `organizations/${organizationID}/product-categories`),
        values
      );
      message.success('Категория успешно добавлена!');
      setIsCategoryModalVisible(false);
      categoryForm.resetFields();
      // Refresh categories list
      const categoriesSnapshot = await getDocs(
        collection(db, `organizations/${organizationID}/product-categories`)
      );
      const categoriesData = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
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
      width: 200,
      render: (text) => (
        <div style={{ whiteSpace: 'nowrap' }}>{text}</div>
      ),
    },
    {
      title: 'Категория',
      key: 'category',
      width: 150,
      render: (text, record) => (
        <div style={{ whiteSpace: 'nowrap' }}>
          {record.categoryName || ''}
        </div>
      ),
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (price) => (
        <div style={{ whiteSpace: 'nowrap' }}>
          {price} сум
        </div>
      ),
    },
    {
      title: 'Сырье',
      dataIndex: 'material',
      key: 'material',
      width: 150,
      render: (text) => (
        <div style={{ whiteSpace: 'nowrap' }}>{text}</div>
      ),
    },
    {
      title: 'Расход сырья (грамм)',
      dataIndex: 'materialUsage',
      key: 'materialUsage',
      width: 180,
      render: (materialUsage) => (
        <div style={{ whiteSpace: 'nowrap' }}>
          {materialUsage} гр
        </div>
      ),
    },
    {
      title: 'Бумага, необходимая для производства (гр)',
      dataIndex: 'requiredPaper',
      key: 'requiredPaper',
      width: 230,
      render: (requiredPaper) => (
        <div style={{ whiteSpace: 'nowrap' }}>
          {requiredPaper} гр
        </div>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (text, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => editProduct(record)}
          />
          <Button
            icon={<DeleteOutlined />}
            onClick={() => deleteProduct(record.id)}
            danger
          />
        </Space>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'all',
      label: 'Все продукты',
    },
    ...categories.map((category) => ({
      key: category.id,
      label: category.name,
    })),
  ];

  const filteredProducts =
    activeTabKey === 'all'
      ? products
      : products.filter((product) => product.categoryId === activeTabKey);

  // Handlers for category settings modal
  const handleCategoryNameChange = (categoryId, newName) => {
    setCategoriesForEditing((prevCategories) =>
      prevCategories.map((category) =>
        category.id === categoryId ? { ...category, name: newName } : category
      )
    );
  };

  const editCategoryName = (categoryId) => {
    setCategoriesForEditing((prevCategories) =>
      prevCategories.map((category) =>
        category.id === categoryId ? { ...category, isEditing: true } : category
      )
    );
  };

  const cancelEditCategoryName = (categoryId) => {
    // Revert the name to original
    const originalCategory = categories.find(
      (category) => category.id === categoryId
    );
    setCategoriesForEditing((prevCategories) =>
      prevCategories.map((category) =>
        category.id === categoryId
          ? { ...category, name: originalCategory.name, isEditing: false }
          : category
      )
    );
  };

  const saveCategoryName = async (categoryId) => {
    const categoryToSave = categoriesForEditing.find(
      (category) => category.id === categoryId
    );
    try {
      await updateDoc(
        doc(
          db,
          `organizations/${organizationID}/product-categories`,
          categoryId
        ),
        {
          name: categoryToSave.name,
        }
      );
      message.success('Категория успешно обновлена!');
      setCategoriesForEditing((prevCategories) =>
        prevCategories.map((category) =>
          category.id === categoryId ? { ...category, isEditing: false } : category
        )
      );

      // Update category names in products
      const productsToUpdate = products.filter(
        (product) => product.categoryId === categoryId
      );
      for (const product of productsToUpdate) {
        await updateDoc(
          doc(db, `organizations/${organizationID}/products`, product.id),
          {
            categoryName: categoryToSave.name,
          }
        );
      }

      // Refresh data
      const categoriesSnapshot = await getDocs(
        collection(db, `organizations/${organizationID}/product-categories`)
      );
      const categoriesData = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);

      const productsSnapshot = await getDocs(
        collection(db, `organizations/${organizationID}/products`)
      );
      const productsData = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);
    } catch (error) {
      message.error('Ошибка при обновлении категории: ' + error.message);
    }
  };

  const hasDocumentsInCollection = async (collectionPath) => {
    const snapshot = await getDocs(
      query(collection(db, collectionPath), limit(1))
    );
    return !snapshot.empty;
  };

  const deleteCategory = async (categoryId) => {
    try {
      // Check if organization has any customers
      const hasCustomers = await hasDocumentsInCollection(
        `organizations/${organizationID}/customers`
      );
      if (hasCustomers) {
        message.error(
          'Невозможно удалить категорию: У организации зарегистрированы клиенты.'
        );
        return;
      }
      // Check if organization has any orders
      const hasOrders = await hasDocumentsInCollection(
        `organizations/${organizationID}/orders`
      );
      if (hasOrders) {
        message.error(
          'Невозможно удалить категорию: У организации зарегистрированы заказы.'
        );
        return;
      }
      // Check if organization has any products
      const hasProducts = await hasDocumentsInCollection(
        `organizations/${organizationID}/products`
      );
      if (hasProducts) {
        message.error(
          'Невозможно удалить категорию: У организации зарегистрированы продукты.'
        );
        return;
      }
      // Check if organization has any paper rolls
      const hasPaperRolls = await hasDocumentsInCollection(
        `organizations/${organizationID}/paper-rolls`
      );
      if (hasPaperRolls) {
        message.error(
          'Невозможно удалить категорию: У организации зарегистрированы бумажные роллы.'
        );
        return;
      }
      // All checks passed, delete the category
      await deleteDoc(
        doc(db, `organizations/${organizationID}/product-categories`, categoryId)
      );
      message.success('Категория успешно удалена!');
      // Update categories state
      setCategoriesForEditing((prevCategories) =>
        prevCategories.filter((category) => category.id !== categoryId)
      );
      setCategories((prevCategories) =>
        prevCategories.filter((category) => category.id !== categoryId)
      );
    } catch (error) {
      message.error('Ошибка при удалении категории: ' + error.message);
    }
  };

  // Edit product handler
  const editProduct = (product) => {
    setIsEditMode(true);
    setEditingProduct(product);
    setIsProductModalVisible(true);
    form.setFieldsValue({
      title: product.title,
      categoryId: product.categoryId,
      price: product.price,
      material: product.material,
      materialUsage: product.materialUsage,
      requiredPaper: product.requiredPaper,
    });
  };

  // Delete product handler
  const deleteProduct = async (productId) => {
    try {
      // Check if organization has any customers
      const hasCustomers = await hasDocumentsInCollection(
        `organizations/${organizationID}/customers`
      );
      if (hasCustomers) {
        message.error(
          'Невозможно удалить продукт: У организации зарегистрированы клиенты.'
        );
        return;
      }
      // Check if organization has any orders
      const hasOrders = await hasDocumentsInCollection(
        `organizations/${organizationID}/orders`
      );
      if (hasOrders) {
        message.error(
          'Невозможно удалить продукт: У организации зарегистрированы заказы.'
        );
        return;
      }
      // Check if organization has any products besides the one we're deleting
      const productsSnapshot = await getDocs(
        collection(db, `organizations/${organizationID}/products`)
      );
      if (productsSnapshot.size > 1) {
        message.error(
          'Невозможно удалить продукт: У организации зарегистрированы другие продукты.'
        );
        return;
      }
      // Check if organization has any paper rolls
      const hasPaperRolls = await hasDocumentsInCollection(
        `organizations/${organizationID}/paper-rolls`
      );
      if (hasPaperRolls) {
        message.error(
          'Невозможно удалить продукт: У организации зарегистрированы бумажные роллы.'
        );
        return;
      }
      // All checks passed, delete the product
      await deleteDoc(
        doc(db, `organizations/${organizationID}/products`, productId)
      );
      message.success('Продукт успешно удален!');
      // Update products state
      setProducts((prevProducts) =>
        prevProducts.filter((product) => product.id !== productId)
      );
    } catch (error) {
      message.error('Ошибка при удалении продукта: ' + error.message);
    }
  };

  return (
    <div>
      <Space style={{ marginBottom: 20 }}>
        <Button type="primary" onClick={showProductModal}>
          Добавить новый продукт
        </Button>
        <Button type="default" onClick={showCategoryModal}>
          Добавить новую категорию
        </Button>
      </Space>

      <Tabs
        activeKey={activeTabKey}
        onChange={(key) => setActiveTabKey(key)}
        tabBarExtraContent={
          <Button
            icon={<SettingOutlined />}
            onClick={showCategorySettingsModal}
          />
        }
      >
        {tabItems.map((tab) => (
          <Tabs.TabPane tab={tab.label} key={tab.key} />
        ))}
      </Tabs>

      <Table
        dataSource={filteredProducts}
        columns={productColumns}
        rowKey="id"
        scroll={{ x: 'max-content' }} // Enable horizontal scrolling
      />

      {/* Product Modal */}
      <Modal
        title={isEditMode ? 'Редактировать продукт' : 'Добавить новый продукт'}
        visible={isProductModalVisible}
        onCancel={handleProductCancel}
        onOk={form.submit}
        okText={isEditMode ? 'Сохранить' : 'Добавить'}
        cancelText="Отмена"
      >
        <Form form={form} layout="vertical" onFinish={handleAddProduct}>
          <Form.Item
            name="title"
            label="Название продукта"
            rules={[
              {
                required: true,
                message: 'Пожалуйста, введите название продукта!',
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="categoryId"
            label="Категория"
            rules={[
              { required: true, message: 'Пожалуйста, выберите категорию!' },
            ]}
          >
            <Select placeholder="Выберите категорию">
              {categories.map((category) => (
                <Select.Option key={category.id} value={category.id}>
                  {category.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="price"
            label="Цена"
            rules={[
              { required: true, message: 'Пожалуйста, введите цену!' },
            ]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="material"
            label="Сырье"
            rules={[
              { required: true, message: 'Пожалуйста, выберите сырье!' },
            ]}
          >
            <Select placeholder="Выберите сырье">
              {materialTypes.map((materialType) => (
                <Select.Option key={materialType.id} value={materialType.name}>
                  {materialType.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="materialUsage"
            label="Расход сырья за 1 шт. (грамм)"
            rules={[
              {
                required: true,
                message: 'Пожалуйста, введите расход сырья за 1 ед.',
              },
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>

          {/* New Field for Paper Required */}
          <Form.Item
            name="requiredPaper"
            label="Бумага, необходимая для производства 1,000 шт (в гр)"
            rules={[
              {
                required: true,
                message:
                  'Пожалуйста, введите количество бумаги, необходимой для производства 1,000 шт (в гр)',
              },
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Category Modal */}
      <Modal
        title="Добавить новую категорию"
        visible={isCategoryModalVisible}
        onCancel={handleCategoryCancel}
        onOk={categoryForm.submit}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form
          form={categoryForm}
          layout="vertical"
          onFinish={handleAddCategory}
        >
          <Form.Item
            name="name"
            label="Название категории"
            rules={[
              {
                required: true,
                message: 'Пожалуйста, введите название категории!',
              },
            ]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      {/* Category Settings Modal */}
      <Modal
        title="Управление категориями"
        visible={isCategorySettingsModalVisible}
        onCancel={handleCategorySettingsCancel}
        footer={null}
      >
        {categoriesForEditing.map((category) => (
          <div
            key={category.id}
            style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}
          >
            <Input
              value={category.name}
              onChange={(e) =>
                handleCategoryNameChange(category.id, e.target.value)
              }
              disabled={!category.isEditing}
              style={{ marginRight: 8 }}
            />
            {category.isEditing ? (
              <>
                <Button
                  type="primary"
                  onClick={() => saveCategoryName(category.id)}
                  style={{ marginRight: 8 }}
                >
                  Сохранить
                </Button>
                <Button
                  onClick={() => cancelEditCategoryName(category.id)}
                  style={{ marginRight: 8 }}
                >
                  Отмена
                </Button>
              </>
            ) : (
              <Button
                icon={<EditOutlined />}
                onClick={() => editCategoryName(category.id)}
                style={{ marginRight: 8 }}
              />
            )}
            <Button
              icon={<DeleteOutlined />}
              onClick={() => deleteCategory(category.id)}
              danger
            />
          </div>
        ))}
      </Modal>
    </div>
  );
};

export default Products;

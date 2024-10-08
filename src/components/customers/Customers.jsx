// Customers.jsx

import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Cascader,
  message,
  Typography,
  Tabs,
  Card,
  Progress,
  Radio,
  Space,
  Select,
  Checkbox,
} from 'antd';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';
import './Customers.css';
import {
  PlusCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cascaderOptions, setCascaderOptions] = useState([]);
  const [standardRolls, setStandardRolls] = useState([]);
  const [isCustomerModalVisible, setIsCustomerModalVisible] = useState(false);
  const [isRollModalVisible, setIsRollModalVisible] = useState(false);
  const [isEditRollModalVisible, setIsEditRollModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [rollForm] = Form.useForm();
  const [editRollForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const { organizationID, role } = useOutletContext();
  const [activeTab, setActiveTab] = useState('1');
  const [isStandardPaper, setIsStandardPaper] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editingRoll, setEditingRoll] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const productWeightOptions = [5, 4.5, 4, 3.5];

  useEffect(() => {
    if (organizationID) {
      fetchProductsCategoriesAndCustomers();
      fetchStandardRolls();
    }
  }, [organizationID]);

  const fetchProductsCategoriesAndCustomers = async () => {
    try {
      const [categoriesSnapshot, productsSnapshot, customersSnapshot] =
        await Promise.all([
          getDocs(
            collection(db, `organizations/${organizationID}/product-categories`)
          ),
          getDocs(collection(db, `organizations/${organizationID}/products`)),
          getDocs(collection(db, `organizations/${organizationID}/customers`)),
        ]);

      const categoriesData = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const productsData = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      const customersData = customersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          paper: data.paper || { used: 0, available: 0, remaining: 0 },
          productWeight: data.productWeight || 5,
          paperUsageRate: data.paperUsageRate || 222,
        };
      });

      setCategories(categoriesData);
      setProducts(productsData);
      setCascaderOptions(
        categoriesData.map((category) => ({
          value: category.id,
          label: category.name,
          children: productsData
            .filter((p) => p.categoryId === category.id)
            .map((p) => ({
              value: p.id,
              label: p.title,
            })),
        }))
      );
      setCustomers(customersData);
    } catch (error) {
      console.error("Ошибка при загрузке данных:", error);
      message.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const fetchStandardRolls = async () => {
    try {
      const rollsSnapshot = await getDocs(
        collection(db, `organizations/${organizationID}/standard-rolls`)
      );
      const rollsData = rollsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        usageRates: doc.data().usageRates || {},
      }));
      setStandardRolls(rollsData);
    } catch (error) {
      console.error("Ошибка при загрузке стандартных рулонов:", error);
      message.error('Ошибка при загрузке стандартных рулонов');
    }
  };

  const handleSaveCustomer = async (values) => {
    setButtonLoading(true);
    try {
      const [categoryId, productId] = values.product;
      const customerData = {
        ...values,
        product: { categoryId, productId },
        usesStandardPaper: isStandardPaper,
        productWeight: values.productWeight,
      };

      if (!isStandardPaper) {
        const availablePaper = parseFloat(values.availablePaper) || 0;
        customerData.paper = {
          used: 0,
          available: availablePaper,
          remaining: availablePaper,
        };
        customerData.paperUsageRate = values.paperUsageRate;
      }

      if (role === 'member') {
        delete customerData.price;
      }

      if (isEditMode && editingCustomer) {
        const customerDocRef = doc(
          db,
          `organizations/${organizationID}/customers`,
          editingCustomer.id
        );
        await updateDoc(customerDocRef, customerData);
        message.success('Данные клиента обновлены!');
      } else {
        await addDoc(
          collection(db, `organizations/${organizationID}/customers`),
          customerData
        );
        message.success('Клиент добавлен!');
      }

      fetchProductsCategoriesAndCustomers();
      setIsCustomerModalVisible(false);
      form.resetFields();
      setIsEditMode(false);
      setEditingCustomer(null);
    } catch (error) {
      console.error("Ошибка при сохранении клиента:", error);
      message.error('Ошибка при сохранении клиента');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleEditCustomer = (customer) => {
    setIsEditMode(true);
    setEditingCustomer(customer);
    setIsCustomerModalVisible(true);
    setIsStandardPaper(customer.usesStandardPaper);
    form.setFieldsValue({
      companyName: customer.companyName,
      brand: customer.brand,
      personInCharge: customer.personInCharge,
      product: [customer.product.categoryId, customer.product.productId],
      price: customer.price,
      availablePaper: customer.paper ? customer.paper.available : 0,
      productWeight: customer.productWeight,
      paperUsageRate: customer.paperUsageRate,
    });
  };

  const handleDeleteCustomer = async (customerId) => {
    try {
      await deleteDoc(
        doc(db, `organizations/${organizationID}/customers`, customerId)
      );
      message.success('Клиент удален!');
      fetchProductsCategoriesAndCustomers();
    } catch (error) {
      console.error("Ошибка при удалении клиента:", error);
      message.error('Ошибка при удалении клиента');
    }
  };

  const handleCreateStandardRoll = async (values) => {
    setButtonLoading(true);
    try {
      const { product, kg, weights, usageRates } = values;

      // Проверка, что хотя бы одно usageRate указано
      const hasAtLeastOneUsageRate = weights.some(weight => usageRates[weight] !== undefined && usageRates[weight] !== null);

      if (!hasAtLeastOneUsageRate) {
        message.error('Необходимо указать хотя бы один расход бумаги для выбранных весов!');
        return;
      }

      // Форматирование usageRates в объект, где ключи — веса, а значения — usageRate
      const formattedUsageRates = {};
      weights.forEach((weight) => {
        if (usageRates[weight] !== undefined && usageRates[weight] !== null) {
          formattedUsageRates[weight] = usageRates[weight];
        }
      });

      await addDoc(
        collection(db, `organizations/${organizationID}/standard-rolls`),
        {
          product: {
            categoryId: product[0],
            productId: product[1],
          },
          kg,
          usageRates: formattedUsageRates,
          used: 0,
          remaining: kg,
        }
      );

      fetchStandardRolls();
      setIsRollModalVisible(false);
      rollForm.resetFields();
      message.success('Стандартный рулон добавлен!');
    } catch (error) {
      console.error("Ошибка при добавлении стандартного рулона:", error);
      message.error('Ошибка при добавлении стандартного рулона');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleEditRoll = (roll) => {
    setEditingRoll(roll);
    setIsEditRollModalVisible(true);
    editRollForm.setFieldsValue({
      product: [roll.product.categoryId, roll.product.productId],
      kg: roll.kg,
      weights: Object.keys(roll.usageRates).map(Number),
      usageRates: roll.usageRates,
    });
  };

  const handleUpdateStandardRoll = async (values) => {
    setButtonLoading(true);
    try {
      const { product, kg, weights, usageRates } = values;

      // Проверка, что хотя бы одно usageRate указано
      const hasAtLeastOneUsageRate = weights.some(weight => usageRates[weight] !== undefined && usageRates[weight] !== null);

      if (!hasAtLeastOneUsageRate) {
        message.error('Необходимо указать хотя бы один расход бумаги для выбранных весов!');
        return;
      }

      // Форматирование usageRates в объект, где ключи — веса, а значения — usageRate
      const formattedUsageRates = {};
      weights.forEach((weight) => {
        if (usageRates[weight] !== undefined && usageRates[weight] !== null) {
          formattedUsageRates[weight] = usageRates[weight];
        }
      });

      const rollDocRef = doc(db, `organizations/${organizationID}/standard-rolls`, editingRoll.id);
      await updateDoc(rollDocRef, {
        product: {
          categoryId: product[0],
          productId: product[1],
        },
        kg,
        usageRates: formattedUsageRates,
        remaining: kg - editingRoll.used,
      });

      fetchStandardRolls();
      setIsEditRollModalVisible(false);
      setEditingRoll(null); // Исправлено на использование сеттера
      editRollForm.resetFields();
      message.success('Стандартный рулон обновлен!');
    } catch (error) {
      console.error("Ошибка при обновлении стандартного рулона:", error);
      message.error('Ошибка при обновлении стандартного рулона');
    } finally {
      setButtonLoading(false);
    }
  };

  const handleDeleteRoll = (rollId) => {
    Modal.confirm({
      title: 'Вы уверены, что хотите удалить этот стандартный рулон?',
      okText: 'Да',
      okType: 'danger',
      cancelText: 'Нет',
      onOk: async () => {
        try {
          await deleteDoc(doc(db, `organizations/${organizationID}/standard-rolls`, rollId));
          fetchStandardRolls();
          message.success('Стандартный рулон удален!');
        } catch (error) {
          console.error("Ошибка при удалении стандартного рулона:", error);
          message.error('Ошибка при удалении стандартного рулона');
        }
      },
    });
  };

  const renderStandardRollsCards = () =>
    standardRolls.map((roll) => {
      const usedPercent = (roll.used / roll.kg) * 100;
      const formattedUsedPercent = usedPercent.toFixed(2);

      const category = categories.find(
        (cat) => cat.id === roll.product.categoryId
      );
      const product = products.find(
        (prod) => prod.id === roll.product.productId
      );

      const categoryName = category ? category.name : 'Категория не найдена';
      const productName = product ? product.title : 'Продукт не найден';

      return (
        <Card
          key={roll.id}
          className="standard-roll-card"
          title={
            <div className="card-header">
              <Title level={5} style={{ color: '#002c8c', margin: 0 }}>
                Рулон стандарт дизайн → {categoryName} / {productName}
              </Title>
              <div className="card-actions">
                <EditOutlined
                  style={{ marginRight: 8, color: '#1890ff', cursor: 'pointer' }}
                  onClick={() => handleEditRoll(roll)}
                />
                <DeleteOutlined
                  style={{ color: '#f5222d', cursor: 'pointer' }}
                  onClick={() => handleDeleteRoll(roll.id)}
                />
              </div>
            </div>
          }
          style={{
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
          headStyle={{ backgroundColor: '#e6f4ff', padding: '10px 16px' }}
        >
          <Progress
            percent={parseFloat(formattedUsedPercent)}
            status="active"
            style={{ marginBottom: '10px' }}
          />
          <p>
            Использовано: {roll.used.toFixed(1)} кг | Осталось:{' '}
            {roll.remaining.toFixed(1)} кг
          </p>
          <div>
            <Title level={5} className="usage-rates-title">
              Расход бумаги в граммах по весу сырья (1 000 шт )
            </Title>
            <ul className="usage-rates-list">
              {Object.entries(roll.usageRates).map(([weight, rate]) => (
                <li key={weight} className="usage-rate-item">
                  Стик {weight} гр → Расход бумаги: {rate} гр
                </li>
              ))}
            </ul>
          </div>
        </Card>
      );
    });

  const renderCustomersTable = (customersList, isStandardPaperTab) => {
    const columns = [
      { title: 'Бренд', dataIndex: 'brand', key: 'brand' },
      { title: 'Компания', dataIndex: 'companyName', key: 'companyName' },
      {
        title: 'Продукт',
        dataIndex: 'product',
        key: 'product',
        render: (product) => {
          if (!product) {
            return 'Продукт не указан';
          }
          const category = categories.find(
            (cat) => cat.id === product.categoryId
          );
          const productData = products.find(
            (prod) => prod.id === product.productId
          );
          const categoryName = category ? category.name : 'Категория не найдена';
          const productName = productData
            ? productData.title
            : 'Продукт не найден';

          return (
            <Text style={{ color: '#8c8c8c', fontWeight: 'lighter' }}>
              {`${categoryName} → ${productName}`}
            </Text>
          );
        },
      },
      {
        title: 'Вес продукта (гр)',
        dataIndex: 'productWeight',
        key: 'productWeight',
        render: (value) => `${value} гр`,
      },
      ...(role !== 'member'
        ? [
            {
              title: 'Цена (сум)',
              dataIndex: 'price',
              key: 'price',
              render: (price) =>
                price
                  ? price.toLocaleString('ru-RU') + ' сум'
                  : 'Цена не указана',
            },
          ]
        : []),
    ];

    if (!isStandardPaperTab) {
      columns.push(
        {
          title: 'Бумага для 1,000 шт (гр)',
          dataIndex: 'paperUsageRate',
          key: 'paperUsageRate',
          render: (value) => (value ? `${value} гр` : 'Не указано'),
        },
        {
          title: 'Доступная бумага (кг)',
          dataIndex: ['paper', 'available'],
          key: 'availablePaper',
          render: (value) => (value !== undefined ? value.toFixed(1) : '-'),
        }
      );
    }

    columns.push({
      title: 'Использованная бумага (кг)',
      dataIndex: ['paper', 'used'],
      key: 'paperUsed',
      render: (value) => (value !== undefined ? value.toFixed(1) : '-'),
    });

    columns.push({
      title: 'Действия',
      key: 'actions',
      render: (text, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEditCustomer(record)}
          />
          <Button
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteCustomer(record.id)}
            danger
          />
        </Space>
      ),
    });

    return (
      <Table
        dataSource={customersList}
        columns={columns}
        rowKey="id"
        pagination={{ pageSize: 15 }}
      />
    );
  };

  // Compute customer counts
  const totalCustomers = customers.length;
  const customLabelCustomersCount = customers.filter(
    (c) => !c.usesStandardPaper
  ).length;
  const standardLabelCustomersCount = customers.filter(
    (c) => c.usesStandardPaper
  ).length;

  // Filter customers based on search and filters
  let customersList;
  if (activeTab === '1') {
    customersList = customers.filter((c) => !c.usesStandardPaper);
  } else {
    customersList = customers.filter((c) => c.usesStandardPaper);
  }

  const filteredCustomers = customersList.filter((customer) => {
    // Apply search filter
    const matchesSearch = [customer.companyName, customer.brand, customer.personInCharge]
      .some((field) =>
        field.toLowerCase().includes(searchQuery.toLowerCase())
      );

    // Apply category filter
    const matchesCategory = selectedCategory
      ? customer.product.categoryId === selectedCategory
      : true;

    // Apply product filter
    const matchesProduct = selectedProduct
      ? customer.product.productId === selectedProduct
      : true;

    return matchesSearch && matchesCategory && matchesProduct;
  });

  return (
    <div>
      <Title level={2}>Клиенты</Title>
      <div className="customers-summary">
        <Text className="summary-text total">
          Итого: {totalCustomers} клиентов
        </Text>
        <Text className="summary-text with-logo">
          С логотипом: {customLabelCustomersCount}
        </Text>
        <Text className="summary-text without-logo">
          Без лого: {standardLabelCustomersCount}
        </Text>
      </div>
      <Tabs
        activeKey={activeTab}
        onChange={(key) => {
          setActiveTab(key);
          // Сбросить фильтры при смене вкладок
          setSearchQuery('');
          setSelectedCategory(null);
          setSelectedProduct(null);
        }}
      >
        <TabPane tab="Клиенты : с логотипом" key="1">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingTop: '15px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Input
                placeholder="Поиск клиентов"
                value={searchQuery}
                prefix={<SearchOutlined />}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '200px', marginRight: '10px' }}
                allowClear
              />
              <Select
                placeholder="Категория продукта"
                style={{ width: '200px', marginRight: '10px' }}
                value={selectedCategory}
                onChange={(value) => {
                  setSelectedCategory(value);
                  setSelectedProduct(null);
                }}
                allowClear
              >
                {categories.map((category) => (
                  <Select.Option key={category.id} value={category.id}>
                    {category.name}
                  </Select.Option>
                ))}
              </Select>
              <Select
                placeholder="Продукт"
                style={{ width: '200px' }}
                value={selectedProduct}
                onChange={(value) => setSelectedProduct(value)}
                disabled={!selectedCategory}
                allowClear
              >
                {selectedCategory &&
                  products
                    .filter((product) => product.categoryId === selectedCategory)
                    .map((product) => (
                      <Select.Option key={product.id} value={product.id}>
                        {product.title}
                      </Select.Option>
                    ))}
              </Select>
            </div>
            <Button
              type="primary"
              onClick={() => {
                setIsCustomerModalVisible(true);
                setIsStandardPaper(false);
                setIsEditMode(false);
                setEditingCustomer(null);
                form.resetFields();
              }}
            >
              Добавить нового клиента
            </Button>
          </div>
          <div style={{ marginTop: 65 }}>
            <Title level={4}>Клиенты с индивидуальной этикеткой</Title>
          </div>
          {renderCustomersTable(filteredCustomers, false)}
        </TabPane>

        <TabPane tab="Клиенты : без лого ( стандарт )" key="2">
          <Button
            type="primary"
            ghost
            onClick={() => setIsRollModalVisible(true)}
            style={{ marginBottom: 20, marginTop: 10 }}
            icon={<PlusCircleOutlined />}
          >
            Создать стандартный рулон
          </Button>
          {renderStandardRollsCards()}
          <div className="standard-customers-header">
            <Title level={4} style={{ margin: 0 }}>
              Клиенты со стандартной этикеткой
            </Title>
            <Button
              type="primary"
              onClick={() => {
                setIsCustomerModalVisible(true);
                setIsStandardPaper(true);
                setIsEditMode(false);
                setEditingCustomer(null);
                form.resetFields();
              }}
            >
              Добавить клиента со стандартной этикеткой
            </Button>
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Input
                placeholder="Поиск клиентов"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                prefix={<SearchOutlined />}
                style={{ width: '200px', marginRight: '10px' }}
                allowClear
              />
              <Select
                placeholder="Категория продукта"
                style={{ width: '200px', marginRight: '10px' }}
                value={selectedCategory}
                onChange={(value) => {
                  setSelectedCategory(value);
                  setSelectedProduct(null);
                }}
                allowClear
              >
                {categories.map((category) => (
                  <Select.Option key={category.id} value={category.id}>
                    {category.name}
                  </Select.Option>
                ))}
              </Select>
              <Select
                placeholder="Продукт"
                style={{ width: '200px' }}
                value={selectedProduct}
                onChange={(value) => setSelectedProduct(value)}
                disabled={!selectedCategory}
                allowClear
              >
                {selectedCategory &&
                  products
                    .filter((product) => product.categoryId === selectedCategory)
                    .map((product) => (
                      <Select.Option key={product.id} value={product.id}>
                        {product.title}
                      </Select.Option>
                    ))}
              </Select>
            </div>
          </div>
          {renderCustomersTable(filteredCustomers, true)}
        </TabPane>
      </Tabs>

      {/* Customer Modal */}
      <Modal
        title={
          isEditMode
            ? 'Редактировать клиента'
            : isStandardPaper
            ? 'Добавить клиента со стандартной этикеткой'
            : 'Добавить клиента с индивидуальной этикеткой'
        }
        visible={isCustomerModalVisible}
        onCancel={() => {
          setIsCustomerModalVisible(false);
          setIsEditMode(false);
          setEditingCustomer(null);
          form.resetFields();
        }}
        onOk={form.submit}
        confirmLoading={buttonLoading}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveCustomer}>
          <Form.Item
            name="companyName"
            label="Название компании"
            rules={[{ required: true, message: 'Введите название компании!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="brand"
            label="Бренд"
            rules={[{ required: true, message: 'Введите бренд!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="personInCharge"
            label="Контактное лицо"
            rules={[{ required: true, message: 'Введите контактное лицо!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="product"
            label="Продукт"
            rules={[{ required: true, message: 'Выберите продукт!' }]}
          >
            <Cascader options={cascaderOptions} />
          </Form.Item>
          <Form.Item
            name="productWeight"
            label="Вес продукта (гр)"
            rules={[
              {
                required: true,
                message: 'Пожалуйста, выберите вес продукта!',
              },
            ]}
          >
            <Radio.Group>
              {productWeightOptions.map((weight) => (
                <Radio.Button
                  key={weight}
                  value={weight}
                  style={{ marginRight: 10 }}
                >
                  {weight} гр
                </Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>
          {role !== 'member' && (
            <Form.Item
              name="price"
              label="Цена (сум)"
              rules={[{ required: true, message: 'Введите цену!' }]}
            >
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          )}
          {!isStandardPaper && (
            <>
              <Form.Item
                name="availablePaper"
                label="Доступная бумага (кг)"
                rules={[
                  { required: true, message: 'Введите количество бумаги!' },
                ]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item
                name="paperUsageRate"
                label="Бумага необходимая для производ-во 1,000 шт (гр)"
                rules={[
                  {
                    required: true,
                    message: 'Введите необходимое количество бумаги!',
                  },
                ]}
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      {/* Standard Roll Creation Modal */}
      <Modal
        title="Создать стандартный рулон"
        visible={isRollModalVisible}
        onCancel={() => setIsRollModalVisible(false)}
        onOk={rollForm.submit}
        confirmLoading={buttonLoading}
      >
        <Form
          form={rollForm}
          layout="vertical"
          onFinish={handleCreateStandardRoll}
        >
          <Form.Item
            name="product"
            label="Продукт"
            rules={[{ required: true, message: 'Выберите продукт!' }]}
          >
            <Cascader options={cascaderOptions} />
          </Form.Item>
          <Form.Item
            name="kg"
            label="Количество (кг)"
            rules={[{ required: true, message: 'Введите количество (кг)!' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="weights"
            label="Выберите веса (гр)"
            rules={[
              {
                validator: (_, value) => {
                  if (value && value.length > 0) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Выберите хотя бы один вес!'));
                },
              },
            ]}
          >
            <Checkbox.Group options={[5, 4.5, 4, 3.5]} />
          </Form.Item>
          <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.weights !== currentValues.weights}>
            {() => {
              const selectedWeights = rollForm.getFieldValue('weights') || [];
              return selectedWeights.map((weight) => (
                <Form.Item
                  key={weight}
                  name={['usageRates', weight]}
                  label={`Кол-во бумаги для производства 1,000 шт ${weight} гр`}
                  rules={[
                    {
                      required: true,
                      message: 'Введите количество бумаги для этого веса!',
                    },
                  ]}
                >
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              ));
            }}
          </Form.Item>
        </Form>
      </Modal>

      {/* Edit Standard Roll Modal */}
      <Modal
        title="Редактировать стандартный рулон"
        visible={isEditRollModalVisible}
        onCancel={() => {
          setIsEditRollModalVisible(false);
          setEditingRoll(null);
          editRollForm.resetFields();
        }}
        onOk={editRollForm.submit}
        confirmLoading={buttonLoading}
      >
        <Form
          form={editRollForm}
          layout="vertical"
          onFinish={handleUpdateStandardRoll}
        >
          <Form.Item
            name="product"
            label="Продукт"
            rules={[{ required: true, message: 'Выберите продукт!' }]}
          >
            <Cascader options={cascaderOptions} />
          </Form.Item>
          <Form.Item
            name="kg"
            label="Количество (кг)"
            rules={[{ required: true, message: 'Введите количество (кг)!' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="weights"
            label="Выберите веса (гр)"
            rules={[
              {
                validator: (_, value) => {
                  if (value && value.length > 0) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Выберите хотя бы один вес!'));
                },
              },
            ]}
          >
            <Checkbox.Group options={[5, 4.5, 4, 3.5]} />
          </Form.Item>
          <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.weights !== currentValues.weights}>
            {() => {
              const selectedWeights = editRollForm.getFieldValue('weights') || [];
              return selectedWeights.map((weight) => (
                <Form.Item
                  key={weight}
                  name={['usageRates', weight]}
                  label={`Кол-во бумаги для производства 1,000 шт ${weight} гр`}
                  rules={[
                    {
                      required: true,
                      message: 'Введите количество бумаги для этого веса!',
                    },
                  ]}
                >
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              ));
            }}
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Customers;

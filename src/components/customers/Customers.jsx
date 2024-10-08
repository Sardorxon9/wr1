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
  const [form] = Form.useForm();
  const [rollForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const { organizationID, role } = useOutletContext();
  const [activeTab, setActiveTab] = useState('1');
  const [isStandardPaper, setIsStandardPaper] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  const productWeightOptions = [5, 4.5, 4, 3.5, 3];

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
      message.error('Ошибка при загрузке данных');
    } finally {
      setLoading(false);
    }
  };

  const fetchStandardRolls = async () => {
    const rollsSnapshot = await getDocs(
      collection(db, `organizations/${organizationID}/standard-rolls`)
    );
    const rollsData = rollsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setStandardRolls(rollsData);
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
      message.error('Ошибка при удалении клиента');
    }
  };

  const handleCreateStandardRoll = async (values) => {
    try {
      await addDoc(
        collection(db, `organizations/${organizationID}/standard-rolls`),
        {
          ...values,
          used: 0,
          remaining: values.kg,
          product: {
            categoryId: values.product[0],
            productId: values.product[1],
          },
          usageRate: values.usageRate,
        }
      );
      fetchStandardRolls();
      setIsRollModalVisible(false);
      rollForm.resetFields();
      message.success('Стандартный рулон добавлен!');
    } catch (error) {
      message.error('Ошибка при добавлении стандартного рулона');
    }
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
            <>
              <Text type="secondary">Стандартный дизайн</Text> →{' '}
              <Text strong>{categoryName}</Text> →{' '}
              <Text strong>{productName}</Text>
            </>
          }
          style={{
            marginBottom: '20px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
          headStyle={{ backgroundColor: '#e6f4ff' }}
        >
          <Progress
            percent={parseFloat(formattedUsedPercent)}
            status="active"
          />
          <p>
            Использовано: {roll.used.toFixed(1)} кг | Осталось:{' '}
            {roll.remaining.toFixed(1)} кг
          </p>
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
          const productName = productData ? productData.title : 'Продукт не найден';

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

  return (
    <div>
      <Title level={2}>Клиенты</Title>
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Индивидуальная бумага" key="1">
          <Button
            type="primary"
            onClick={() => {
              setIsCustomerModalVisible(true);
              setIsStandardPaper(false);
              setIsEditMode(false);
              setEditingCustomer(null);
              form.resetFields();
            }}
            style={{ marginBottom: 20 }}
          >
            Добавить нового клиента
          </Button>
          {renderCustomersTable(
            customers.filter((c) => !c.usesStandardPaper),
            false
          )}
        </TabPane>

        <TabPane tab="Стандартная бумага" key="2">
          <Button
            type="dashed"
            onClick={() => setIsRollModalVisible(true)}
            style={{ marginBottom: 20, marginTop: 10 }}
            icon={<PlusCircleOutlined />}
          >
            Создать стандартный рулон
          </Button>
          {renderStandardRollsCards()}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 20,
              marginTop: 20,
            }}
          >
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
          {renderCustomersTable(
            customers.filter((c) => c.usesStandardPaper),
            true
          )}
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
            name="usageRate"
            label="Бумага, необходимая для производства 1,000 шт (гр)"
            rules={[
              {
                required: true,
                message: 'Введите необходимое количество бумаги!',
              },
            ]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Customers;

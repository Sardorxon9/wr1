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
  Empty,
  Space,
} from 'antd';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';
import {
  ExclamationCircleOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const { Title, Text } = Typography;
const { confirm } = Modal;

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cascaderOptions, setCascaderOptions] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const { organizationID, role } = useOutletContext();

  const [isEditing, setIsEditing] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);

  useEffect(() => {
    const fetchProductsCategoriesAndCustomers = async () => {
      if (organizationID) {
        try {
          // Fetch categories
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
          const productsData = productsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setProducts(productsData);

          // Cascader options: map categories to their products using IDs
          const options = categoriesData.map((category) => ({
            value: category.id, // Use category ID
            label: category.name,
            children: productsData
              .filter((product) => product.categoryId === category.id)
              .map((product) => ({
                value: product.id, // Use product ID
                label: product.title,
              })),
          }));
          setCascaderOptions(options);

          // Fetch customers
          const customersSnapshot = await getDocs(
            collection(db, `organizations/${organizationID}/customers`)
          );
          const customersData = customersSnapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              paper: data.paper || { used: 0, available: 0, remaining: 0 },
            };
          });
          setCustomers(customersData);
        } catch (error) {
          message.error('Ошибка при загрузке данных: ' + error.message);
        }
      }
      setLoading(false);
    };

    fetchProductsCategoriesAndCustomers();
  }, [organizationID]);

  const showModal = (customer) => {
    if (customer) {
      setIsEditing(true);
      setCurrentCustomer(customer);
      form.setFieldsValue({
        ...customer,
        product: [customer.product.categoryId, customer.product.productId],
        availablePaper: customer.paper?.available || 0,
        phone: customer.phone || '',
      });
    } else {
      setIsEditing(false);
      form.resetFields();
    }
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setIsEditing(false);
    setCurrentCustomer(null);
    form.resetFields();
  };

  const handleSaveCustomer = async (values) => {
    setButtonLoading(true);
    try {
      const availablePaper = parseFloat(values.availablePaper) || 0;

      const [categoryId, productId] = values.product;

      if (isEditing && currentCustomer) {
        // Update existing customer
        const customerRef = doc(
          db,
          `organizations/${organizationID}/customers`,
          currentCustomer.id
        );
        await updateDoc(customerRef, {
          ...values,
          product: {
            categoryId,
            productId,
          },
          paper: {
            ...currentCustomer.paper,
            available: availablePaper,
          },
        });
        message.success('Клиент успешно обновлен!');
        // Update the state
        setCustomers(
          customers.map((c) =>
            c.id === currentCustomer.id
              ? {
                  ...c,
                  ...values,
                  product: {
                    categoryId,
                    productId,
                  },
                  paper: {
                    ...currentCustomer.paper,
                    available: availablePaper,
                  },
                }
              : c
          )
        );
      } else {
        // Add new customer
        await addDoc(
          collection(db, `organizations/${organizationID}/customers`),
          {
            ...values,
            product: {
              categoryId,
              productId,
            },
            paper: {
              used: 0,
              available: availablePaper,
              remaining: availablePaper,
            },
          }
        );
        message.success('Клиент успешно добавлен!');
        // Fetch the customers again to get the new customer with its ID
        const customersSnapshot = await getDocs(
          collection(db, `organizations/${organizationID}/customers`)
        );
        const customersData = customersSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setCustomers(customersData);
      }
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Ошибка при сохранении клиента: ' + error.message);
    } finally {
      setButtonLoading(false);
      setIsEditing(false);
      setCurrentCustomer(null);
    }
  };

  const getProductNameById = (productId) => {
    const product = products.find((p) => p.id === productId);
    return product ? product.title : 'Unknown Product';
  };

  const getCategoryNameById = (categoryId) => {
    const category = categories.find((c) => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const handleEditCustomer = (customer) => {
    showModal(customer);
  };

  const handleDeleteCustomer = (customer) => {
    confirm({
      title: 'Вы уверены, что хотите удалить этого клиента?',
      icon: <ExclamationCircleOutlined />,
      content: 'Это действие нельзя будет отменить.',
      okText: 'Да',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          await deleteDoc(
            doc(db, `organizations/${organizationID}/customers`, customer.id)
          );
          message.success('Клиент успешно удален!');
          setCustomers(customers.filter((c) => c.id !== customer.id));
        } catch (error) {
          message.error('Ошибка при удалении клиента: ' + error.message);
        }
      },
    });
  };

  const columns = [
    {
      title: 'Бренд',
      dataIndex: 'brand',
      key: 'brand',
      width: 150,
      render: (text, record) => (
        <>
          <Text
            strong={record.paper?.available === 0}
            style={{
              color: record.paper?.available === 0 ? 'red' : 'black',
              whiteSpace: 'nowrap',
            }}
          >
            {text}
          </Text>
          {record.paper?.available === 0 && (
            <ExclamationCircleOutlined style={{ color: 'red', marginLeft: 8 }} />
          )}
        </>
      ),
    },
    {
      title: 'Компания',
      dataIndex: 'companyName',
      key: 'companyName',
      width: 150,
      render: (text) => (
        <div style={{ whiteSpace: 'nowrap' }}>
          {text}
        </div>
      ),
    },
    {
      title: 'Контактное лицо',
      dataIndex: 'personInCharge',
      key: 'personInCharge',
      width: 150,
      render: (text) => (
        <div style={{ whiteSpace: 'nowrap' }}>
          {text}
        </div>
      ),
    },
    {
      title: 'Продукт',
      dataIndex: 'product',
      key: 'product',
      width: 200,
      render: (product) => {
        const categoryId = product?.categoryId;
        const productId = product?.productId;

        const categoryName = getCategoryNameById(categoryId);
        const productName = getProductNameById(productId);

        return (
          <div style={{ whiteSpace: 'nowrap' }}>
            <Text type="secondary">{categoryName}</Text> {' → '}
            <Text>{productName}</Text>
          </div>
        );
      },
    },
    ...(role === 'owner' ? [
      {
        title: 'Цена (сум)',
        dataIndex: 'price',
        key: 'price',
        width: 100,
        render: (price) => (
          <div style={{ whiteSpace: 'nowrap' }}>
            {price.toLocaleString()}
          </div>
        ),
      },
    ] : []),
    {
      title: 'Использованная бумага (кг)',
      dataIndex: ['paper', 'used'],
      key: 'paperUsed',
      width: 150,
      render: (used) => {
        const usedNumber = parseFloat(used);
        if (isNaN(usedNumber)) {
          return '0 кг';
        } else {
          return usedNumber.toFixed(1) + ' кг';
        }
      },
    },
    {
      title: 'Доступная бумага (кг)',
      dataIndex: ['paper', 'available'],
      key: 'paperAvailable',
      width: 150,
      render: (available) => {
        const availableNumber = parseFloat(available);
        if (isNaN(availableNumber)) {
          return '0 кг';
        } else {
          return availableNumber.toFixed(1) + ' кг';
        }
      },
    },
    ...(role === 'owner' ? [
      {
        title: 'Действия',
        key: 'actions',
        width: 100,
        render: (text, record) => (
          <Space size="middle">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEditCustomer(record)}
            />
            <Button
              type="link"
              icon={<DeleteOutlined style={{ color: 'red' }} />}
              onClick={() => handleDeleteCustomer(record)}
            />
          </Space>
        ),
      },
    ] : []),
  ];

  return (
    <div>
      <Title level={2}>Клиенты</Title>
      {role === 'owner' && (
        <Button
          type="primary"
          onClick={() => showModal(null)}
          style={{ marginBottom: 20 }}
        >
          Добавить нового клиента
        </Button>
      )}
      {customers.length === 0 && !loading ? (
        <Empty
          description={
            <span>
              Клиенты не зарегистрированы. Пожалуйста, нажмите кнопку ниже, чтобы
              начать регистрацию клиентов.
            </span>
          }
        />
      ) : (
        <Table
          dataSource={customers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          scroll={{ x: true }}
        />
      )}

      <Modal
        title={isEditing ? 'Редактировать клиента' : 'Добавить нового клиента'}
        visible={isModalVisible}
        onCancel={handleCancel}
        onOk={form.submit}
        okText={isEditing ? 'Сохранить изменения' : 'Добавить'}
        cancelText="Отмена"
        confirmLoading={buttonLoading}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveCustomer}>
          <Form.Item
            name="companyName"
            label="Название компании"
            rules={[
              { required: true, message: 'Пожалуйста, введите название компании!' },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="brand"
            label="Бренд"
            rules={[{ required: true, message: 'Пожалуйста, введите бренд!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="personInCharge"
            label="Контактное лицо"
            rules={[
              {
                required: true,
                message: 'Пожалуйста, введите имя контактного лица!',
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="product"
            label="Продукт"
            rules={[{ required: true, message: 'Пожалуйста, выберите продукт!' }]}
          >
            <Cascader options={cascaderOptions} placeholder="Выберите продукт" />
          </Form.Item>
          <Form.Item
            name="price"
            label="Цена (сум)"
            rules={[{ required: true, message: 'Пожалуйста, введите цену!' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="availablePaper"
            label="Доступная бумага (кг)"
            rules={[
              {
                required: true,
                message: 'Пожалуйста, введите количество доступной бумаги!',
              },
            ]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Телефон"
            rules={[
              { required: true, message: 'Пожалуйста, введите номер телефона!' },
            ]}
          >
            <PhoneInput
              country={'uz'}
              onlyCountries={['uz']}
              countryCodeEditable={false}
              placeholder="Введите номер телефона"
              inputStyle={{ width: '100%' }}
              containerStyle={{ width: '100%' }}
              inputProps={{
                required: true,
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Customers;

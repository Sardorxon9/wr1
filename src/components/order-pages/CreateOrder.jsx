import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Button,
  DatePicker,
  InputNumber,
  Radio,
  Typography,
  Space,
  message,
  Select,
  Spin,
  Cascader,
} from 'antd';
import dayjs from 'dayjs';
import {
  setDoc,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../login-signUp/firebase';

const { Title, Text } = Typography;

const CreateOrder = () => {
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();
  const [orderPreview, setOrderPreview] = useState({
    client: '',
    product: [],
    quantity: 1,
    price: 0,
  });
  const [organizationID, setOrganizationID] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, 'owner-users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const orgID = userDocSnap.data().organizationID;
          if (orgID) {
            setOrganizationID(orgID);
            fetchCustomersAndProducts(orgID);
          } else {
            console.error('Organization ID is missing!');
          }
        } else {
          console.error('No such user!');
        }
      }
    };

    const fetchCustomersAndProducts = async (orgID) => {
      setLoadingCustomers(true);

      // Fetch categories
      const categoriesSnapshot = await getDocs(
        collection(db, `organizations/${orgID}/product-categories`)
      );
      const categoriesData = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);

      // Fetch products
      const productsSnapshot = await getDocs(
        collection(db, `organizations/${orgID}/products`)
      );
      const productsData = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);

      // Fetch customers
      const customersSnapshot = await getDocs(
        collection(db, `organizations/${orgID}/customers`)
      );
      const customersData = customersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomers(customersData);

      setLoadingCustomers(false);
      await generateOrderNumber();
    };

    fetchUserData();
  }, []);

  const generateOrderNumber = async () => {
    if (!organizationID) return;

    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = `0${now.getMonth() + 1}`.slice(-2);
    const randomChars = Math.random().toString(36).substring(2, 4).toUpperCase();

    const ordersRef = collection(db, `organizations/${organizationID}/orders`);
    const ordersQuery = query(ordersRef, orderBy('date', 'desc'), limit(1));
    const latestOrderSnapshot = await getDocs(ordersQuery);

    let sequenceNumber = 1;
    if (!latestOrderSnapshot.empty) {
      const latestOrder = latestOrderSnapshot.docs[0].data();
      const latestOrderNumber = latestOrder.orderNumber;

      if (latestOrderNumber) {
        const latestSequence = parseInt(latestOrderNumber.slice(-4), 10);
        if (!isNaN(latestSequence)) {
          sequenceNumber = latestSequence + 1;
        }
      }
    }

    const formattedSequence = `0000${sequenceNumber}`.slice(-4);
    setOrderNumber(`${year}${month}${randomChars}${formattedSequence}`);
  };

  const onValuesChange = (_, allValues) => {
    const selectedCustomer = customers.find(
      (customer) => customer.brand === allValues.client
    );
    setSelectedCustomer(selectedCustomer);

    if (selectedCustomer) {
      const categoryId = selectedCustomer.product?.categoryId;
      const productId = selectedCustomer.product?.productId;

      if (categoryId && productId) {
        const category = categories.find((cat) => cat.id === categoryId);
        const product = products.find((prod) => prod.id === productId);

        form.setFieldsValue({
          product: [categoryId, productId],
          price: selectedCustomer.price,
        });

        setSelectedProduct(product);
      } else {
        setSelectedProduct(null);
      }
    } else {
      setSelectedProduct(null);
    }

    // Update selectedProduct based on current form values
    const currentProductIds = allValues.product || [];
    if (currentProductIds.length === 2) {
      const currentProduct = products.find(
        (prod) => prod.id === currentProductIds[1]
      );
      setSelectedProduct(currentProduct);
    } else {
      setSelectedProduct(null);
    }

    setOrderPreview(allValues);
  };

  const formatQuantityInKg = (quantity, weightPerUnit) => {
    const totalWeight = (quantity * weightPerUnit) / 1000;
    return `${totalWeight.toFixed(2)} kg`;
  };

  const onFinish = async (values) => {
    if (!organizationID) return;
    setLoading(true);
    try {
      const orderId = `order_${new Date().getTime()}`;
      const total = values.quantity * values.price;

      const selectedProduct = products.find(
        (product) =>
          product.id === values.product[1] &&
          product.categoryId === values.product[0]
      );
      if (!selectedProduct) throw new Error('Продукт не найден.');

      // Update Material Usage (same as before)
      // ...

      // Paper Usage Logic (same as before)
      // ...

      // Save the order data
      const selectedCategory = categories.find(
        (cat) => cat.id === values.product[0]
      );

      const orderData = {
        ...values,
        date: values.date ? values.date.toDate() : new Date(),
        total,
        email: auth.currentUser.email,
        orderNumber,
        orderID: orderId,
        client: {
          id: selectedCustomer?.id || '',
          brand: selectedCustomer?.brand || '',
          companyName: selectedCustomer?.companyName || '',
        },
        product: {
          categoryId: values.product ? values.product[0] : '',
          productId: values.product ? values.product[1] : '',
          categoryName: selectedCategory?.name || '',
          productTitle: selectedProduct?.title || '',
        },
      };

      await setDoc(
        doc(db, `organizations/${organizationID}/orders`, orderId),
        orderData
      );

      // Show success message
      messageApi.open({
        type: 'success',
        content: 'Заказ успешно добавлен!',
      });

      // Reset form and state
      form.resetFields();
      setOrderPreview({ client: '', product: [], quantity: 1, price: 0 });
      setSelectedProduct(null);
      setSelectedCustomer(null);
      await generateOrderNumber();
    } catch (error) {
      messageApi.open({
        type: 'error',
        content: 'Ошибка: ' + error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const productOptions = categories.map((category) => ({
    value: category.id,
    label: category.name,
    children: products
      .filter((product) => product.categoryId === category.id)
      .map((product) => ({
        value: product.id,
        label: product.title,
      })),
  }));

  return (
    <div className="create-order-container">
      {contextHolder}
      <div className="order-header">
        <div className="header-content-page">
          <Title level={3}>Добавить новый заказ</Title>
          <Text>Заказ номер: {orderNumber}</Text>
        </div>
      </div>
      {loading ? (
        <div className="loading-spinner">
          <Spin tip="Заказ добавляется... Подождите" />
        </div>
      ) : (
        <Form
          layout="vertical"
          form={form}
          onValuesChange={onValuesChange}
          onFinish={onFinish}
          initialValues={{
            quantity: 1,
            price: 0,
            status: 'in-progress',
            date: dayjs(),
          }}
        >
          <Space
            size="large"
            direction="vertical"
            style={{ width: '100%' }}
          >
            <div className="form-row">
              <Form.Item
                name="date"
                label="Дата"
                rules={[
                  { required: true, message: 'Пожалуйста, выберите дату!' },
                ]}
              >
                <DatePicker
                  defaultPickerValue={dayjs()}
                  defaultValue={dayjs()}
                  placeholder="Выберите дату"
                />
              </Form.Item>
              <Form.Item
                name="client"
                label="Клиент"
                rules={[
                  { required: true, message: 'Пожалуйста, выберите клиента!' },
                ]}
              >
                <Select
                  placeholder="Выберите клиента"
                  loading={loadingCustomers}
                >
                  {customers.length > 0 ? (
                    customers.map((customer) => (
                      <Select.Option
                        key={customer.id}
                        value={customer.brand}
                      >
                        {customer.brand}
                        {customer.paper && !customer.usesStandardPaper && (
                          <Text type="secondary">
                            {'  '} | Доступно бумаги :{' '}
                            {customer.paper.available || 0} кг
                          </Text>
                        )}
                      </Select.Option>
                    ))
                  ) : (
                    <Select.Option disabled>
                      Данные загружаются...
                    </Select.Option>
                  )}
                </Select>
              </Form.Item>
              <Form.Item
                name="product"
                label="Продукт"
                rules={[
                  { required: true, message: 'Пожалуйста, выберите продукт!' },
                ]}
              >
                <Cascader
                  options={productOptions}
                  placeholder="Выберите продукт"
                  // Removed 'disabled' prop to make it editable
                />
              </Form.Item>
            </div>
            <div className="form-row">
              <Form.Item
                name="quantity"
                label="Количество"
                rules={[
                  {
                    required: true,
                    message: 'Пожалуйста, введите количество!',
                  },
                ]}
              >
                <InputNumber
                  min={1}
                  style={{ width: '100%' }}
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                  parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
              <Form.Item
                name="price"
                label="Цена"
                rules={[
                  { required: true, message: 'Пожалуйста, введите цену!' },
                ]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={(value) =>
                    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  }
                  parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                  // Removed 'disabled' prop to make it editable
                />
              </Form.Item>
              <Form.Item
                name="status"
                label="Статус"
                rules={[
                  { required: true, message: 'Пожалуйста, выберите статус!' },
                ]}
              >
                <Radio.Group>
                  <Radio value="in-progress">В процессе</Radio>
                  <Radio value="ready">Готов к отправке</Radio>
                  <Radio value="delivered">Доставлено</Radio>
                </Radio.Group>
              </Form.Item>
            </div>
            <div className="order-preview">
              <div className="order-summary">
                <div>
                  <Text strong>Клиент:</Text> {orderPreview.client}
                </div>
                <div>
                  <Text strong>Продукт:</Text>{' '}
                  {orderPreview.product?.length > 0
                    ? (() => {
                        const category = categories.find(
                          (cat) => cat.id === orderPreview.product[0]
                        );
                        const product = products.find(
                          (prod) => prod.id === orderPreview.product[1]
                        );
                        return `${category?.name || ''} → ${product?.title || ''}`;
                      })()
                    : ''}
                </div>
                <div>
                  <Text strong>Количество:</Text>{' '}
                  {(orderPreview.quantity || 0).toLocaleString()} шт
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    (
                    {formatQuantityInKg(
                      orderPreview.quantity || 0,
                      selectedProduct?.materialUsage || 0
                    )}{' '}
                    {selectedProduct?.material || ''})
                  </Text>
                </div>
                <div>
                  <Text strong>Цена:</Text>{' '}
                  {(orderPreview.price || 0).toLocaleString()} сум
                </div>
                <div className="order-total">
                  <Text strong>Итого:</Text>{' '}
                  {(
                    (orderPreview.quantity || 0) *
                    (orderPreview.price || 0)
                  ).toLocaleString()}{' '}
                  сум
                </div>
              </div>
            </div>
            <div
              className="form-actions"
              style={{
                display: 'flex',
                flexDirection: 'column-reverse',
                gap: '10px',
              }}
            >
              <Button type="default">Отмена</Button>
              <Button type="primary" htmlType="submit">
                Добавить новый заказ
              </Button>
            </div>
          </Space>
        </Form>
      )}
    </div>
  );
};

export default CreateOrder;

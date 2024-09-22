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
          const organizationID = userDocSnap.data().organizationID;
          setOrganizationID(organizationID);

          // Once the organizationID is available, fetch the customer data
          fetchCustomersAndProducts(organizationID);
        } else {
          console.error('No such user!');
        }
      }
    };

    const fetchCustomersAndProducts = async (organizationID) => {
      setLoadingCustomers(true);

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

      // Fetch customers
      const customersSnapshot = await getDocs(
        collection(db, `organizations/${organizationID}/customers`)
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
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (`0${now.getMonth() + 1}`).slice(-2);
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

    const formattedSequence = (`0000${sequenceNumber}`).slice(-4);
    setOrderNumber(`${year}${month}${randomChars}${formattedSequence}`);
  };

  const onValuesChange = (_, allValues) => {
    const selectedCustomer = customers.find(
      (customer) => customer.brand === allValues.client
    );
    setSelectedCustomer(selectedCustomer);

    if (selectedCustomer) {
      const categoryName = selectedCustomer.product.category;
      const productTitle = selectedCustomer.product.title;

      form.setFieldsValue({
        product: [categoryName, productTitle],
        price: selectedCustomer.price,
      });

      const selectedProduct = products.find(
        (product) =>
          product.title === productTitle && product.category === categoryName
      );
      setSelectedProduct(selectedProduct);
    } else {
      // Reset product and price if no customer is selected
      form.setFieldsValue({
        product: [],
        price: 0,
      });
      setSelectedProduct(null);
    }

    setOrderPreview(allValues);
  };

  const formatQuantityInKg = (quantity, weightPerUnit) => {
    const totalWeight = (quantity * weightPerUnit) / 1000;
    return `${totalWeight.toFixed(2)} kg`;
  };

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const orderId = `order_${new Date().getTime()}`;
      const total = values.quantity * values.price;

      // Fetch the selected product
      const selectedProduct = products.find(
        (product) =>
          product.title === values.product[1] &&
          product.category === values.product[0]
      );
      if (!selectedProduct) throw new Error('Продукт не найден.');

      // Fetch all materials of the required type
      const materialsRef = collection(
        db,
        `organizations/${organizationID}/materials`
      );
      const materialQuery = query(
        materialsRef,
        where('type', '==', selectedProduct.material)
      );
      const materialSnapshot = await getDocs(materialQuery);

      if (materialSnapshot.empty) {
        throw new Error(`Материал "${selectedProduct.material}" не найден.`);
      }

      // Extract material data
      const materialsData = materialSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Ensure 'dateRegistered' is a JavaScript Date object
      materialsData.forEach((material) => {
        if (material.dateRegistered && material.dateRegistered.toDate) {
          material.dateRegistered = material.dateRegistered.toDate();
        } else {
          material.dateRegistered = new Date(0); // Default to epoch if missing
        }
      });

      // Sort materials by 'dateRegistered' in ascending order
      materialsData.sort((a, b) => a.dateRegistered - b.dateRegistered);

      // Adjusted filtering conditions
      const partiallyUsedMaterials = materialsData.filter((material) => {
        const used = material.used || 0;
        const available = material.available || 0;
        const initialQuantity = material.initialQuantity || 0;

        if (initialQuantity === 0) {
          return used > 0 && available > 0;
        }

        return used > 0 && available > 0 && available < initialQuantity;
      });

      const unusedMaterials = materialsData.filter((material) => {
        const used = material.used || 0;
        const available = material.available || 0;
        const initialQuantity = material.initialQuantity || 0;

        if (initialQuantity === 0) {
          return used === 0 && available > 0;
        }

        return used === 0 && available > 0 && available === initialQuantity;
      });

      // Combine them, prioritizing partially used materials
      const sortedMaterials = [...partiallyUsedMaterials, ...unusedMaterials];

      // Calculate total available material
      const totalAvailableMaterial = sortedMaterials.reduce(
        (total, material) => total + (material.available || 0),
        0
      );

      // Calculate total material required for the order in kg
      const totalMaterialRequired =
        (values.quantity * selectedProduct.materialUsage) / 1000;

      // Check if total material is sufficient
      if (totalAvailableMaterial < totalMaterialRequired) {
        const maxPossibleQuantity = Math.floor(
          (totalAvailableMaterial * 1000) / selectedProduct.materialUsage
        );
        throw new Error(
          `Недостаточно материала "${selectedProduct.material}". Максимально возможное количество: ${maxPossibleQuantity}.`
        );
      }

      // Distribute material usage across materials
      let remainingMaterialRequired = totalMaterialRequired;
      const materialUpdates = [];

      for (const material of sortedMaterials) {
        if (remainingMaterialRequired <= 0) break;

        const materialAvailable = material.available || 0;
        const materialToUse = Math.min(
          materialAvailable,
          remainingMaterialRequired
        );

        const updatedAvailable = materialAvailable - materialToUse;
        const updatedUsed = (material.used || 0) + materialToUse;

        materialUpdates.push({
          id: material.id,
          updatedData: {
            available: updatedAvailable,
            used: updatedUsed,
          },
        });

        remainingMaterialRequired -= materialToUse;
      }

      // Apply updates to materials
      const materialUpdatePromises = materialUpdates.map((update) => {
        const materialDocRef = doc(
          db,
          `organizations/${organizationID}/materials`,
          update.id
        );
        return updateDoc(materialDocRef, update.updatedData);
      });

      await Promise.all(materialUpdatePromises);

      // **Update customer's paper info**
      const totalPaperRequired =
        (values.quantity * selectedProduct.requiredPaper) / 1000000;

      if (selectedCustomer.paper.available < totalPaperRequired) {
        const availablePaperGrams = selectedCustomer.paper.available * 1000;
        const maxThousandUnitsPaper = Math.floor(
          availablePaperGrams / selectedProduct.requiredPaper
        );
        const maxPossibleQuantityPaper = maxThousandUnitsPaper * 1000;

        throw new Error(
          `Недостаточно бумаги. Максимально возможное количество: ${maxPossibleQuantityPaper}.`
        );
      }

      const updatedAvailablePaper =
        selectedCustomer.paper.available - totalPaperRequired;
      const updatedUsedPaper =
        (selectedCustomer.paper.used || 0) + totalPaperRequired;

      const customerDocRef = doc(
        db,
        `organizations/${organizationID}/customers`,
        selectedCustomer.id
      );
      await updateDoc(customerDocRef, {
        'paper.available': updatedAvailablePaper,
        'paper.used': updatedUsedPaper,
      });

      // **Save the order data**
      const orderData = {
        ...values,
        date: values.date ? values.date.toDate() : new Date(),
        total,
        email: auth.currentUser.email,
        orderNumber,
        orderID: orderId,
        client: {
          brand: selectedCustomer?.brand || '',
          companyName: selectedCustomer?.companyName || '',
        },
        product: {
          category: values.product ? values.product[0] : '',
          title: values.product ? values.product[1] : '',
        },
      };

      await setDoc(
        doc(db, `organizations/${organizationID}/orders`, orderId),
        orderData
      );

      // **Show success message**
      messageApi.open({
        type: 'success',
        content: 'Заказ успешно добавлен!',
      });

      // **Reset form and state**
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
    value: category.name,
    label: category.name,
    children: products
      .filter((product) => product.category === category.name)
      .map((product) => ({
        value: product.title,
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
                        <Text type="secondary">
                          {'  '} {'  '}
                          | Доступно бумаги : {customer.paper?.available || 0} кг
                        </Text>
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
                />
              </Form.Item>
              <Form.Item
                name="status"
                label="Статус"
                rules={[
                  { required: true, message: 'Пожалуйста, выберите статус!' },
                ]}
              >
                <Radio.Group wrapperMarginInlineEnd="55" >
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
                    ? orderPreview.product.join(' → ')
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

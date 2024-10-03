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
  const [productWeight, setProductWeight] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [showProductWeightInput, setShowProductWeightInput] = useState(false);
  const productWeightOptions = [5, 4.5, 4, 3.5, 3];

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
      const customersData = customersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          productWeight: data.productWeight || 5, // Assign default value if missing
        };
      });
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

    // Update selectedProduct based on current form values
    const currentProductIds = allValues.product || [];

    if (selectedCustomer) {
      const customerProduct = selectedCustomer.product;

      // If customerProduct exists, set the form's product field to the customer's default product
      if (
        customerProduct &&
        (!allValues.product || allValues.product.length === 0)
      ) {
        form.setFieldsValue({
          product: [customerProduct.categoryId, customerProduct.productId],
        });
        currentProductIds[0] = customerProduct.categoryId;
        currentProductIds[1] = customerProduct.productId;
      }

      // Set price if customer has price
      if (selectedCustomer.price && !allValues.price) {
        form.setFieldsValue({
          price: selectedCustomer.price,
        });
      }
    }

    if (currentProductIds.length === 2) {
      const currentProduct = products.find(
        (prod) => prod.id === currentProductIds[1]
      );
      setSelectedProduct(currentProduct);

      if (selectedCustomer) {
        const customerProduct = selectedCustomer.product;
        const isDefaultProduct =
          customerProduct.categoryId === currentProductIds[0] &&
          customerProduct.productId === currentProductIds[1];

        if (isDefaultProduct) {
          setShowProductWeightInput(false);
          setProductWeight(selectedCustomer.productWeight);
          form.setFieldsValue({
            productWeight: selectedCustomer.productWeight,
          });
        } else {
          setShowProductWeightInput(true);
          setProductWeight(allValues.productWeight);
        }
      } else {
        setShowProductWeightInput(false);
        setProductWeight(null);
      }
    } else {
      setSelectedProduct(null);
      setShowProductWeightInput(false);
      setProductWeight(null);
    }

    setOrderPreview({
      ...orderPreview,
      ...allValues,
    });
  };

  const formatQuantityInKg = (quantity, weightPerUnit) => {
    const totalWeight = (quantity * weightPerUnit) / 1000;
    return `${totalWeight.toFixed(2)} кг`;
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

      // Determine productWeight
      let productWeightValue;
      const customerProduct = selectedCustomer.product;
      const isDefaultProduct =
        customerProduct.categoryId === values.product[0] &&
        customerProduct.productId === values.product[1];

      if (isDefaultProduct) {
        productWeightValue = selectedCustomer.productWeight;
      } else {
        productWeightValue = values.productWeight;
        if (!productWeightValue) {
          throw new Error('Пожалуйста, выберите вес продукта.');
        }
      }

      // Calculate total material required in kg
      const totalMaterialRequired =
        (values.quantity * productWeightValue) / 1000; // Convert to kg

      // Update Material Usage
      const materialsRef = collection(
        db,
        `organizations/${organizationID}/materials`
      );

      // Use selectedProduct.material to match the material's 'type'
      const materialQuery = query(
        materialsRef,
        where('type', '==', selectedProduct.material)
      );
      const materialSnapshot = await getDocs(materialQuery);

      if (materialSnapshot.empty) {
        throw new Error(`Материал "${selectedProduct.material}" не найден.`);
      }

      const materialsData = materialSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Sort materials by dateRegistered (oldest first)
      materialsData.forEach((material) => {
        if (material.dateRegistered && material.dateRegistered.toDate) {
          material.dateRegistered = material.dateRegistered.toDate();
        } else {
          material.dateRegistered = new Date(0);
        }
      });

      materialsData.sort((a, b) => a.dateRegistered - b.dateRegistered);

      // Calculate total available material
      const totalAvailableMaterial = materialsData.reduce(
        (total, material) => total + (material.available || 0),
        0
      );

      if (totalAvailableMaterial < totalMaterialRequired) {
        const maxPossibleQuantity = Math.floor(
          (totalAvailableMaterial * 1000) / productWeightValue
        );
        throw new Error(
          `Недостаточно материала "${selectedProduct.material}". Максимально возможное количество: ${maxPossibleQuantity}.`
        );
      }

      let remainingMaterialRequired = totalMaterialRequired;
      const materialUpdates = [];

      for (const material of materialsData) {
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

      const materialUpdatePromises = materialUpdates.map((update) => {
        const materialDocRef = doc(
          db,
          `organizations/${organizationID}/materials`,
          update.id
        );
        return updateDoc(materialDocRef, update.updatedData);
      });

      await Promise.all(materialUpdatePromises);

      // Paper Usage Logic
      if (selectedCustomer.usesStandardPaper) {
        // Customer uses standard paper (standard label customer)
        // Fetch the standard roll(s) matching the product
        const standardRollsRef = collection(
          db,
          `organizations/${organizationID}/standard-rolls`
        );
        const standardRollsQuery = query(
          standardRollsRef,
          where('product.categoryId', '==', selectedProduct.categoryId),
          where('product.productId', '==', selectedProduct.id)
        );
        const standardRollsSnapshot = await getDocs(standardRollsQuery);

        if (standardRollsSnapshot.empty) {
          throw new Error('Нет стандартного рулона для данного продукта.');
        }

        const standardRollsData = standardRollsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Use the first matching standard roll
        const standardRoll = standardRollsData[0];

        // Ensure usageRate is available
        if (!standardRoll.usageRate) {
          throw new Error(
            'Отсутствует поле usageRate в стандартном рулоне.'
          );
        }

        // Calculate paper usage based on usageRate
        const usageRate = standardRoll.usageRate; // in grams per 1,000 units
        const quantityInThousands = values.quantity / 1000;
        const totalPaperRequired = (quantityInThousands * usageRate) / 1000; // Convert to kg

        if (standardRoll.remaining < totalPaperRequired) {
          throw new Error('Недостаточно стандартной бумаги на складе.');
        }

        // Update standard roll usage
        const updatedUsed = (standardRoll.used || 0) + totalPaperRequired;
        const updatedRemaining =
          (standardRoll.remaining || 0) - totalPaperRequired;

        const standardRollDocRef = doc(
          db,
          `organizations/${organizationID}/standard-rolls`,
          standardRoll.id
        );
        await updateDoc(standardRollDocRef, {
          used: updatedUsed,
          remaining: updatedRemaining,
        });
      } else {
        // Customer uses custom paper (custom label customer)
        const totalPaperRequired =
          (values.quantity * selectedProduct.requiredPaper) / 1000000; // Convert to kg

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
      }

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
        productWeight: productWeightValue, // Include productWeight in order data
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
      setProductWeight(null);
      setShowProductWeightInput(false);
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

  // Label style for form items
  const labelStyle = { color: '#595959' };

  return (
    <div className="create-order-container">
      {contextHolder}
      <div
        className="order-header"
        style={{ marginBottom: '20px' }} // Added whitespace
      >
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
                label={<span style={labelStyle}>Дата</span>}
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
                label={<span style={labelStyle}>Клиент</span>}
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
                label={<span style={labelStyle}>Продукт</span>}
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
            {showProductWeightInput && (
              <Form.Item
                name="productWeight"
                label={<span style={labelStyle}>Вес продукта (гр)</span>}
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
            )}
            <div className="form-row">
              <Form.Item
                name="quantity"
                label={<span style={labelStyle}>Количество</span>}
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
                label={<span style={labelStyle}>Цена</span>}
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
                label={<span style={labelStyle}>Статус</span>}
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
                      productWeight || 0
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

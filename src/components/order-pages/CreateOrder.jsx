import React, { useState, useEffect } from 'react';
import { Form, Input, Button, DatePicker, InputNumber, Radio, Typography, Space, message, Select, Spin, Cascader } from 'antd';
import dayjs from 'dayjs';
import { setDoc, doc, getDoc, collection, getDocs, query, orderBy, limit, updateDoc } from "firebase/firestore";
import { auth, db } from "../login-signUp/firebase";

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
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false); 
  const [orderNumber, setOrderNumber] = useState('');

  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "owner-users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setOrganizationID(userDocSnap.data().organizationID);
        } else {
          console.error("No such user!");
        }
      }
    };
    fetchUserData();
  }, []);

  useEffect(() => {
    const fetchProductsAndCustomers = async () => {
      if (organizationID) {
        setLoadingCustomers(true); 

        const productsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/products`));
        const productsData = productsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(productsData)
        setProducts(productsData);

        const customersSnapshot = await getDocs(collection(db, `organizations/${organizationID}/customers`));
        const customersData = customersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCustomers(customersData);

        setLoadingCustomers(false); 

        await generateOrderNumber();
      }
    };

    fetchProductsAndCustomers();
  }, [organizationID]);
  

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
    const selectedCustomer = customers.find(customer => customer.brand === allValues.client);
    if (selectedCustomer) {
        // Set the correct product options based on selected customer
        const productID = selectedCustomer.product[1]; // Extract the product ID

        // Fetch product details from the 'products' collection
        const fetchProductDetails = async () => {
            try {
                const productRef = doc(db, `organizations/${organizationID}/products/${productID}`);
                const productSnapshot = await getDoc(productRef);
                if (productSnapshot.exists()) {
                    const fetchedProduct = productSnapshot.data();
                    form.setFieldsValue({
                        product: [fetchedProduct.category, fetchedProduct.title],
                        price: selectedCustomer.price,
                    });
                } else {
                    console.error("Product not found!");
                }
            } catch (error) {
                console.error("Error fetching product details:", error);
            }
        };

        fetchProductDetails(); // Call the function to fetch product details
    }
    setOrderPreview(allValues);
};


  const onFinish = async (values) => {
    setLoading(true);
    try {
      const orderId = `order_${new Date().getTime()}`;
      const total = values.quantity * values.price;
  
      const selectedProduct = products.find(product => product.title === values.product[1]);
  
      if (!selectedProduct) {
        throw new Error('Продукт не найден. Пожалуйста, проверьте данные заказа.');
      }
  
      const allMaterialsSnapshot = await getDocs(collection(db, `organizations/${organizationID}/materials`));
      const materials = allMaterialsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
      const filteredMaterials = materials
        .filter(material => material.type === selectedProduct.material)
        .sort((a, b) => a.dateAdded.toMillis() - b.dateAdded.toMillis());
  
      let remainingQuantity = values.quantity * selectedProduct.materialUsage / 1000;
  
      const totalAvailableMaterial = filteredMaterials.reduce((sum, material) => sum + material.available, 0);
      if (remainingQuantity > totalAvailableMaterial) {
        throw new Error('Недостаточно материала для выполнения заказа. Пожалуйста, проверьте количество материалов.');
      }
  
      const selectedCustomer = customers.find(customer => customer.brand === values.client);
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
        }
      };
  
      await setDoc(doc(db, `organizations/${organizationID}/orders`, orderId), orderData);
  
      for (const material of filteredMaterials) {
        if (remainingQuantity <= 0) break;
  
        const materialDocRef = doc(db, `organizations/${organizationID}/materials`, material.id);
        const availableAmount = material.available;
  
        if (availableAmount > remainingQuantity) {
          await updateDoc(materialDocRef, {
            used: material.used + remainingQuantity,
            available: availableAmount - remainingQuantity,
          });
          remainingQuantity = 0;
        } else {
          await updateDoc(materialDocRef, {
            used: material.total,
            available: 0,
          });
          remainingQuantity -= availableAmount;
        }
      }
  
      messageApi.open({
        type: 'success',
        content: 'Заказ успешно добавлен!',
      });
      form.resetFields();
      setOrderPreview({ client: '', product: [], quantity: 1, price: 0 });
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

  const formatQuantityInKg = (quantity, weightPerUnit) => {
    const totalWeight = (quantity * weightPerUnit) / 1000;
    return `${totalWeight.toFixed(2)} kg`;
  };

  const productOptions = products.reduce((acc, product) => {
    if (!product.category || !product.title) {
      // Skip if category or title is missing
      return acc;
    }
  
    const category = product.category;
    const productItem = { value: product.title, label: product.title };
  
    const categoryIndex = acc.findIndex(item => item.value === category);
  
    if (categoryIndex > -1) {
      // If category exists, push the product under it
      acc[categoryIndex].children.push(productItem);
    } else {
      // If category does not exist, create a new category with the product
      acc.push({ value: category, label: category, children: [productItem] });
    }
  
    return acc;
  }, []);

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
          <Spin tip="Заказ добавляется...Подождите" />
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
          <Space size="large" direction="vertical" style={{ width: '100%' }}>
            <div className="form-row">
              <Form.Item 
                name="date" 
                label="Дата" 
                rules={[{ required: true, message: 'Пожалуйста, выберите дату!' }]}
              >
                <DatePicker 
                  defaultPickerValue={dayjs()} 
                  defaultValue={dayjs()} 
                  placeholder="Выберите дату" 
                />
              </Form.Item>
              <Form.Item name="client" label="Клиент" rules={[{ required: true, message: 'Пожалуйста, выберите клиента!' }]}>
                <Select 
                  placeholder="Выберите клиента" 
                  loading={loadingCustomers} // Use the loading prop
                >
                  {customers.length > 0 ? (
                    customers.map(customer => (
                      <Select.Option key={customer.id} value={customer.brand}>
                        {customer.brand}
                      </Select.Option>
                    ))
                  ) : (
                    <Select.Option disabled>Данные загружаются...</Select.Option>
                  )}
                </Select>
              </Form.Item>
              <Form.Item name="product" label="Продукт" rules={[{ required: true, message: 'Пожалуйста, выберите продукт!' }]}>
                <Cascader options={productOptions} placeholder="Выберите продукт" />
              </Form.Item>
            </div>
            <div className="form-row">
              <Form.Item 
                name="quantity" 
                label="Количество" 
                rules={[{ required: true, message: 'Пожалуйста, введите количество!' }]}
              >
                <InputNumber 
                  min={1} 
                  style={{ width: '100%' }} 
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
              <Form.Item 
                name="price" 
                label="Цена" 
                rules={[{ required: true, message: 'Пожалуйста, введите цену!' }]}
              >
                <InputNumber 
                  min={0} 
                  style={{ width: '100%' }} 
                  formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={value => value.replace(/\$\s?|(,*)/g, '')}
                />
              </Form.Item>
              <Form.Item 
                name="status" 
                label="Статус" 
                rules={[{ required: true, message: 'Пожалуйста, выберите статус!' }]}
              >
                <Radio.Group>
                  <Radio value="in-progress">В процессе</Radio>
                  <Radio value="delivered">Доставлено</Radio>
                  <Radio value="ready">Готов к отправке</Radio>
                </Radio.Group>
              </Form.Item>
            </div>
            <div className="order-preview">
              <div className="order-summary">
                <div><Text strong>Клиент:</Text> {orderPreview.client}</div>
                <div><Text strong>Продукт:</Text> {orderPreview.product?.length > 0 ? orderPreview.product.join(' → ') : ''}</div>
                <div>
                  <Text strong>Количество:</Text> {(orderPreview.quantity || 0).toLocaleString()} шт
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({formatQuantityInKg(orderPreview.quantity || 0, products.find(p => p.title === (orderPreview.product?.[1] || ''))?.materialUsage || 0)})
                  </Text>
                </div>
                <div><Text strong>Цена:</Text> {(orderPreview.price || 0).toLocaleString()} сум</div>
                <div className="order-total">
                  <Text strong>Итого:</Text> {((orderPreview.quantity || 0) * (orderPreview.price || 0)).toLocaleString()} сум
                </div>
              </div>
            </div>
            <div className="form-actions" style={{ display: 'flex', flexDirection: 'column-reverse', gap: '10px' }}>
              <Button type="default">Отмена</Button>
              <Button type="primary" htmlType="submit">Добавить новый заказ</Button>
            </div>
          </Space>
        </Form>
      )}
    </div>
  );
};

export default CreateOrder;

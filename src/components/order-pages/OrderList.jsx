import React, { useState, useEffect } from 'react';
import {
  Table,
  Select,
  DatePicker,
  message,
  Typography,
  Badge,
  Radio,
  Card,
  Tabs,
  Spin,
  Button,
  Modal,
  InputNumber,
  Input,
} from 'antd';

import {
  UnorderedListOutlined,
  AppstoreOutlined,
  CodeSandboxOutlined,
  CarOutlined,
  LoadingOutlined,
  DeleteOutlined,
  CheckOutlined,
  SearchOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { db } from '../login-signUp/firebase';
import { useOutletContext } from 'react-router-dom';
import './OrderList.css';

// Import Day.js and the isBetween plugin
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

// Extend Day.js with the isBetween plugin
dayjs.extend(isBetween);


const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;
const { RangePicker } = DatePicker;

const statusOptions = [
  {
    label: 'В процессе',
    value: 'in-progress',
    color: 'orange',
    backgroundColor: '#FFE7BA',
    textColor: '#FF8C00',
    icon: <CarOutlined />,
  },
  {
    label: 'Готов к отправке',
    value: 'ready',
    color: 'blue',
    backgroundColor: '#BAE1FF',
    textColor: '#1E90FF',
    icon: <CodeSandboxOutlined />,
  },
  {
    label: 'Частично доставлено',
    value: 'partially-delivered',
    color: 'teal',
    backgroundColor: '#B2DFDB',
    textColor: '#00897B',
    icon: <CarOutlined />,
  },
  {
    label: 'Доставлено',
    value: 'delivered',
    color: 'green',
    backgroundColor: '#C8E6C9',
    textColor: '#388E3C',
    icon: <CarOutlined />,
  },
];

const OrderList = () => {

    const { organizationID, role } = useOutletContext();
    const [dataSource, setDataSource] = useState([]);
    const [viewMode, setViewMode] = useState('table');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [loading, setLoading] = useState(true);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [customers, setCustomers] = useState([]);
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [deletingOrder, setDeletingOrder] = useState(null);
    const [deleteOption, setDeleteOption] = useState(null);
    const [partialDeliveryOrderId, setPartialDeliveryOrderId] = useState(null);
    const [partialDeliveryQuantity, setPartialDeliveryQuantity] = useState(null);

  // New States for Search and Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [sortCategory, setSortCategory] = useState(null);
  const [sortProduct, setSortProduct] = useState(null);

 
   // New States for Date Filtering
   const [dateFilterType, setDateFilterType] = useState('year');
   const [dateRange, setDateRange] = useState([
     dayjs().startOf('year'),
     dayjs().endOf('year'),
   ]);


   useEffect(() => {
    if (organizationID) {
      fetchOrdersAndProducts(organizationID);
    } else {
      console.error('Organization ID is not defined');
    }
  }, [organizationID]);

  const fetchOrdersAndProducts = async (orgID) => {
    setLoading(true);
    try {
      // Fetch orders ordered by date descending
      const ordersRef = collection(db, `organizations/${orgID}/orders`);
      const ordersQueryInstance = query(ordersRef, orderBy('date', 'desc'));
      const ordersSnapshot = await getDocs(ordersQueryInstance);
      const orders = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDataSource(orders);

      // Fetch products
      const productsSnapshot = await getDocs(
        collection(db, `organizations/${orgID}/products`)
      );
      const productsData = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);

      // Fetch categories
      const categoriesSnapshot = await getDocs(
        collection(db, `organizations/${orgID}/product-categories`)
      );
      const categoriesData = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);

      // Fetch customers
      const customersSnapshot = await getDocs(
        collection(db, `organizations/${orgID}/customers`)
      );
      const customersData = customersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomers(customersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      message.error('Ошибка при загрузке данных.');
    } finally {
      setLoading(false);
    }
  };

   // Function to reset all filters
  const resetFilters = () => {
    setSearchQuery('');
    setSortCategory(null);
    setSortProduct(null);
    setDateFilterType('year');
    setDateRange([dayjs().startOf('year'), dayjs().endOf('year')]);
    setSelectedStatus('all');
  };

  
  const handleDeleteOrder = async (id, deleteOption) => {
    try {
      const orderDocRef = doc(db, `organizations/${organizationID}/orders`, id);
      const orderDoc = await getDoc(orderDocRef);
      if (orderDoc.exists()) {
        const orderData = orderDoc.data();

        // Find the product from the order data
        const selectedProduct = products.find(
          (product) => product.id === orderData.product?.productId
        );

        if (selectedProduct) {
          // Get the material related to the product
          const materialsRef = collection(
            db,
            `organizations/${organizationID}/materials`
          );
          const materialQuery = query(
            materialsRef,
            where('type', '==', selectedProduct.material)
          );
          const materialSnapshot = await getDocs(materialQuery);

          if (!materialSnapshot.empty) {
            const materialDoc = materialSnapshot.docs[0];
            const materialDocRef = doc(
              db,
              `organizations/${organizationID}/materials`,
              materialDoc.id
            );
            const materialData = materialDoc.data();

            // Calculate material used in the order
            const materialUsedInOrder =
              (orderData.quantity * selectedProduct.materialUsage) / 1000; // grams to kg

            // Update material stock
            const updatedUsed = (materialData.used || 0) - materialUsedInOrder;
            const updatedAvailable =
              (materialData.available || 0) + materialUsedInOrder;

            // Update the material stock in Firestore
            await updateDoc(materialDocRef, {
              used: updatedUsed,
              available: updatedAvailable,
            });
          }

          // Restore paper if deleteOption is 'wrongOrder'
          if (deleteOption === 'wrongOrder') {
            // Get the customer data
            const customerDoc = customers.find(
              (customer) => customer.id === orderData.client?.id
            );

            if (customerDoc) {
              const customerData = customerDoc;
              const usesStandardPaper = customerData.usesStandardPaper;

              if (usesStandardPaper) {
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

                if (!standardRollsSnapshot.empty) {
                  const standardRollsData = standardRollsSnapshot.docs.map(
                    (doc) => ({
                      id: doc.id,
                      ...doc.data(),
                    })
                  );

                  // Use the first matching standard roll
                  const standardRoll = standardRollsData[0];

                  // Calculate paper used in the order
                  const usageRate = standardRoll.usageRate; // in grams per 1,000 units
                  const quantityInThousands = orderData.quantity / 1000;
                  const totalPaperRequired =
                    (quantityInThousands * usageRate) / 1000; // Convert to kg

                  // Update standard roll usage
                  const updatedUsed =
                    (standardRoll.used || 0) - totalPaperRequired;
                  const updatedRemaining =
                    (standardRoll.remaining || 0) + totalPaperRequired;

                  const standardRollDocRef = doc(
                    db,
                    `organizations/${organizationID}/standard-rolls`,
                    standardRoll.id
                  );

                  await updateDoc(standardRollDocRef, {
                    used: updatedUsed,
                    remaining: updatedRemaining,
                  });
                }
              } else {
                // Customer uses custom paper (custom label customer)
                const customerDocRef = doc(
                  db,
                  `organizations/${organizationID}/customers`,
                  customerDoc.id
                );
                const paperData = customerData.paper || {};

                // Calculate paper used in the order
                const totalPaperRequired =
                  (orderData.quantity * selectedProduct.requiredPaper) /
                  1000000; // grams to kg

                // Update paper stock
                const updatedPaperUsed =
                  (paperData.used || 0) - totalPaperRequired;
                const updatedPaperAvailable =
                  (paperData.available || 0) + totalPaperRequired;

                await updateDoc(customerDocRef, {
                  'paper.used': updatedPaperUsed,
                  'paper.available': updatedPaperAvailable,
                });
              }
            }
          }
        }

        // Delete the order document from Firestore
        await deleteDoc(doc(db, `organizations/${organizationID}/orders`, id));

        // Update local state to reflect the deleted order
        setDataSource((prevDataSource) =>
          prevDataSource.filter((order) => order.id !== id)
        );

        message.success('Заказ успешно удален');
      }
    } catch (error) {
      console.error('Ошибка при удалении заказа:', error);
      message.error('Ошибка при удалении заказа: ' + error.message);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      const newData = dataSource.map((item) =>
        item.id === id ? { ...item, status: newStatus } : item
      );
      setDataSource(newData);

      const orderRef = doc(db, `organizations/${organizationID}/orders`, id);
      await updateDoc(orderRef, { status: newStatus });
      message.success('Статус успешно обновлен!');
    } catch (error) {
      message.error('Ошибка обновления статуса: ' + error.message);
    }
  };

  const handlePartialDelivery = async (id, deliveredQuantity) => {
    try {
      const newData = dataSource.map((item) =>
        item.id === id
          ? { ...item, status: 'partially-delivered', deliveredQuantity }
          : item
      );
      setDataSource(newData);

      const orderRef = doc(db, `organizations/${organizationID}/orders`, id);
      await updateDoc(orderRef, {
        status: 'partially-delivered',
        deliveredQuantity,
      });
      message.success('Статус успешно обновлен!');
      setPartialDeliveryOrderId(null);
      setPartialDeliveryQuantity(null);
    } catch (error) {
      message.error('Ошибка обновления статуса: ' + error.message);
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const getProductName = (productId) => {
    const product = products.find((prod) => prod.id === productId);
    return product ? product.title : 'Unknown Product';
  };

  const renderCardView = () => {
    const filteredOrders =
      selectedStatus === 'all'
        ? dataSource
        : dataSource.filter((order) => order.status === selectedStatus);

    return (
      <div className="card-container">
        {filteredOrders.map((order) => {
          const statusOption = statusOptions.find(
            (option) => option.value === order.status
          );
          return (
            <Card
              key={order.id}
              className="order-card"
              actions={[
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  danger
                  onClick={() => {
                    setDeletingOrder(order);
                    setDeleteModalVisible(true);
                  }}
                  style={{ color: 'red' }}
                >
                  Удалить
                </Button>,
              ]}
            >
              <Text
                type="secondary"
                style={{ display: 'block', marginBottom: 8 }}
              >
                {order.date && order.date.seconds
                  ? new Date(order.date.seconds * 1000).toLocaleDateString(
                      'ru-RU'
                    )
                  : 'Дата не указана'}
              </Text>
              <Text strong style={{ fontSize: 18, marginBottom: 4 }}>
                {order.client?.brand || 'Клиент не указан'}
              </Text>

              <Text style={{ display: 'block', marginBottom: 8 }}>
                {order.product
                  ? (() => {
                      const productName = `${getCategoryName(
                        order.product.categoryId
                      )} > ${getProductName(order.product.productId)}`;
                      const customer = customers.find(
                        (cust) => cust.id === order.client.id
                      );
                      if (customer && customer.usesStandardPaper) {
                        return `${productName} (Стандарт)`;
                      } else {
                        return productName;
                      }
                    })()
                  : 'Продукт не указан'}
              </Text>
              <Text
                style={{
                  color: '#1890ff',
                  display: 'block',
                  marginBottom: 8,
                }}
              >
                {order.quantity
                  ? order.quantity.toLocaleString('ru-RU')
                  : '0'}{' '}
                шт
              </Text>
              {role === 'owner' && order.price !== undefined && (
                <div style={{ textAlign: 'left', marginBottom: 16 }}>
                  <Text strong style={{ fontSize: 18, color: '#000' }}>
                    {(order.quantity * order.price).toLocaleString('ru-RU')}
                  </Text>
                  <Text
                    style={{
                      display: 'block',
                      fontWeight: 200,
                      color: '#6B7280',
                      fontSize: 14,
                    }}
                  >
                    {order.price.toLocaleString('ru-RU')} сум/шт
                  </Text>
                </div>
              )}
              <Badge
                color={statusOption.backgroundColor}
                text={
                  <>
                    {statusOption.icon}
                    <span style={{ marginLeft: 4 }}>
                      {statusOption.label}
                      {order.status === 'partially-delivered' &&
                        order.deliveredQuantity != null &&
                        `: ${order.deliveredQuantity} / ${order.quantity}`}
                    </span>
                  </>
                }
                style={{
                  backgroundColor: statusOption.backgroundColor,
                  color: statusOption.textColor,
                  marginBottom: 16,
                  display: 'block',
                  padding: '5px 10px',
                  borderRadius: '5px',
                }}
              />
              {/* Add switch or other controls if needed */}
            </Card>
          );
        })}
      </div>
    );
  };

  const columns = [
    {
      title: 'ДАТА',
      dataIndex: 'date',
      sorter: (a, b) =>
        new Date(a.date.seconds * 1000) - new Date(b.date.seconds * 1000),
      render: (_, record) => {
        if (record.date && record.date.seconds) {
          return new Date(record.date.seconds * 1000).toLocaleDateString(
            'ru-RU',
            {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }
          );
        } else {
          return 'Дата отсутствует';
        }
      },
    },
    {
      title: 'КОМПАНИЯ',
      dataIndex: 'client',
      sorter: (a, b) => {
        const nameA = a.client?.companyName.toLowerCase() || '';
        const nameB = b.client?.companyName.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      },
      render: (_, record) => {
        if (record.client?.brand && record.client?.companyName) {
          return (
            <div style={{ textAlign: 'left' }}>
              <Text style={{ fontSize: 16, fontWeight: 600, color: '#000' }}>
                {record.client.brand}
              </Text>
              <Text
                style={{
                  display: 'block',
                  fontWeight: 200,
                  color: '#6B7280',
                }}
              >
                {record.client.companyName}
              </Text>
            </div>
          );
        } else {
          return 'Клиент не найден';
        }
      },
    },
    {
      title: 'ПРОДУКТ',
      dataIndex: 'product',
      sorter: (a, b) => {
        const productA = `${getCategoryName(a.product.categoryId)} > ${getProductName(
          a.product.productId
        )}`.toLowerCase();
        const productB = `${getCategoryName(b.product.categoryId)} > ${getProductName(
          b.product.productId
        )}`.toLowerCase();
        return productA.localeCompare(productB);
      },
      render: (_, record) => {
        if (record.product) {
          const productName = `${getCategoryName(
            record.product.categoryId
          )} > ${getProductName(record.product.productId)}`;
          const customer = customers.find(
            (cust) => cust.id === record.client.id
          );
          if (customer && customer.usesStandardPaper) {
            return `${productName} (Стандарт)`;
          } else {
            return productName;
          }
        } else {
          return 'Продукт не указан';
        }
      },
    },
    {
      title: 'КОЛИЧЕСТВО',
      dataIndex: 'quantity',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (quantity) =>
        quantity ? quantity.toLocaleString('ru-RU') : 'Кол-во не указано',
    },
    ...(role === 'owner'
      ? [
          {
            title: 'ЦЕНА',
            dataIndex: 'price',
            sorter: (a, b) =>
              (a.quantity * a.price) - (b.quantity * b.price),
            render: (_, record) => {
              if (record.price !== undefined) {
                return (
                  <div style={{ textAlign: 'left' }}>
                    <Text
                      strong
                      style={{ fontSize: 16, color: '#000' }}
                    >
                      {(record.quantity * record.price).toLocaleString('ru-RU')}
                    </Text>
                    <Text
                      style={{
                        display: 'block',
                        fontWeight: 200,
                        color: '#6B7280',
                        fontSize: 14,
                      }}
                    >
                      {record.price.toLocaleString('ru-RU')} сум/шт
                    </Text>
                  </div>
                );
              } else {
                return 'Цена не указана';
              }
            },
          },
        ]
      : []),
    {
      title: 'СТАТУС',
      dataIndex: 'status',
      sorter: (a, b) => a.status.localeCompare(b.status),
      render: (_, record) => {
        const statusOption = statusOptions.find(
          (option) => option.value === record.status
        );
        if (statusOption) {
          if (partialDeliveryOrderId === record.id) {
            return (
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <InputNumber
                  min={1}
                  max={record.quantity}
                  value={partialDeliveryQuantity}
                  onChange={(value) => setPartialDeliveryQuantity(value)}
                  placeholder="Кол-во доставлено"
                  style={{ marginRight: 8 }}
                />
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() =>
                    handlePartialDelivery(record.id, partialDeliveryQuantity)
                  }
                  disabled={!partialDeliveryQuantity}
                />
              </div>
            );
          }
          return (
            <div>
              <Select
                placeholder="Выберите статус"
                value={record.status}
                style={{ width: '100%' }}
                onChange={(value) => {
                  if (value === 'partially-delivered') {
                    setPartialDeliveryOrderId(record.id);
                    setPartialDeliveryQuantity(record.deliveredQuantity || null);
                  } else {
                    handleStatusChange(record.id, value);
                  }
                }}
              >
                {statusOptions.map((option) => (
                  <Select.Option key={option.value} value={option.value}>
                    <Badge
                      color={option.color}
                      text={
                        <span style={{ marginLeft: '8px' }}>
                          {option.label}
                          {option.value === 'partially-delivered' &&
                            record.deliveredQuantity != null &&
                            `: ${record.deliveredQuantity} / ${record.quantity}`}
                        </span>
                      }
                    />
                  </Select.Option>
                ))}
              </Select>
            </div>
          );
        }
        return 'Статус не указан';
      },
    },
    {
      title: 'ДЕЙСТВИЕ',
      key: 'action',
      sorter: false,
      render: (_, record) => (
        <Button
          type="link"
          icon={<DeleteOutlined />}
          danger
          onClick={() => {
            setDeletingOrder(record);
            setDeleteModalVisible(true);
          }}
        >
          Удалить
        </Button>
      ),
    },
  ];

  // Function to handle sorting and filtering
  const getFilteredSortedData = () => {
    let filteredData = dataSource;

    // Filter by status
    if (selectedStatus !== 'all') {
      filteredData = filteredData.filter(
        (order) => order.status === selectedStatus
      );
    }

    // Search Filter
    if (searchQuery.trim() !== '') {
      const queryLower = searchQuery.toLowerCase();
      filteredData = filteredData.filter((order) => {
        const client = order.client;
        if (!client) return false;
        const companyName = client.companyName || '';
        const brand = client.brand || '';
        const personInCharge = client.personInCharge || '';
        return (
          companyName.toLowerCase().includes(queryLower) ||
          brand.toLowerCase().includes(queryLower) ||
          personInCharge.toLowerCase().includes(queryLower)
        );
      });
    }

    // Sort by Category
    if (sortCategory) {
      filteredData = filteredData.filter(
        (order) => order.product.categoryId === sortCategory
      );
    }

    // Sort by Product
    if (sortProduct) {
      filteredData = filteredData.filter(
        (order) => order.product.productId === sortProduct
      );
    }
    if (dateRange[0] && dateRange[1]) {
      filteredData = filteredData.filter((order) => {
        if (!order.date || !order.date.seconds) {
          return false;
        }
        const orderDate = dayjs(order.date.seconds * 1000);
        return orderDate.isBetween(dateRange[0], dateRange[1], null, '[]');
      });
    }

    return filteredData;

  };

  const filteredDataSource = getFilteredSortedData();

  return (
    <>
      <div className="order-list-header">
        <Title level={2}>Заказы</Title>
        <Radio.Group
          onChange={(e) => setViewMode(e.target.value)}
          value={viewMode}
        >
          <Radio.Button value="table">
            <UnorderedListOutlined />
          </Radio.Button>
          <Radio.Button value="card">
            <AppstoreOutlined />
          </Radio.Button>
        </Radio.Group>
      </div>

      {/* Search and Sort Controls */}
       {/* Search and Sort Controls */}
       <div className="search-sort-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="left-controls" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}>
          <Input
            placeholder="Поиск клиентов"
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '200px', marginRight: '10px', marginBottom: '10px' }}
            allowClear
          />
          <Select
            placeholder="Категория продукта"
            style={{ width: '200px', marginRight: '10px', marginBottom: '10px' }}
            value={sortCategory}
            onChange={(value) => {
              setSortCategory(value);
              setSortProduct(null); // Reset product filter when category changes
            }}
            allowClear
          >
            {categories.map((category) => (
              <Option key={category.id} value={category.id}>
                {category.name}
              </Option>
            ))}
          </Select>
          <Select
            placeholder="Продукт"
            style={{ width: '200px', marginRight: '10px', marginBottom: '10px' }}
            value={sortProduct}
            onChange={(value) => setSortProduct(value)}
            disabled={!sortCategory}
            allowClear
          >
            {sortCategory &&
              products
                .filter((product) => product.categoryId === sortCategory)
                .map((product) => (
                  <Option key={product.id} value={product.id}>
                    {product.title}
                  </Option>
                ))}
          </Select>
          <Select
            value={dateFilterType}
            onChange={(value) => {
              setDateFilterType(value);
              // Reset date selections when type changes
              if (value === 'year') {
                const start = dayjs().startOf('year');
                const end = dayjs().endOf('year');
                setDateRange([start, end]);
              } else if (value === 'month') {
                const start = dayjs().startOf('month');
                const end = dayjs().endOf('month');
                setDateRange([start, end]);
              } else if (value === 'range') {
                setDateRange([null, null]);
              }
            }}
            style={{ width: '120px', marginRight: '10px', marginBottom: '10px' }}
          >
            <Option value="year">Год</Option>
            <Option value="month">Месяц</Option>
            <Option value="range">Период</Option>
          </Select>
          {dateFilterType === 'year' && (
            <DatePicker
              picker="year"
              value={dateRange[0]}
              onChange={(value) => {
                setDateRange([value.startOf('year'), value.endOf('year')]);
              }}
              style={{ marginRight: '10px', marginBottom: '10px' }}
            />
          )}
          {dateFilterType === 'month' && (
            <DatePicker
              picker="month"
              value={dateRange[0]}
              onChange={(value) => {
                setDateRange([value.startOf('month'), value.endOf('month')]);
              }}
              style={{ marginRight: '2px', marginBottom: '10px' }}
            />
          )}
          {dateFilterType === 'range' && (
            <RangePicker
              value={dateRange}
              onChange={(values) => {
                setDateRange(values);
              }}
              style={{ marginRight: '10px', marginBottom: '10px' }}
            />
          )}
        </div>
        <div className="right-controls">
          <Button
            icon={<ReloadOutlined />}
            type="text"
            onClick={resetFilters}
            style={{ marginLeft: '5px', color: "gray", marginBottom: '10px' }}
          >
            Сбросить фильтры
          </Button>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs
        defaultActiveKey="all"
        onChange={(key) => setSelectedStatus(key)}
        activeKey={selectedStatus}
        style={{ marginBottom: '20px' }}
      >
        <TabPane tab="Все" key="all" />
        {statusOptions.map((option) => (
          <TabPane tab={option.label} key={option.value} />
        ))}
      </Tabs>

      {loading ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
          }}
        >
          <Spin indicator={<LoadingOutlined spin />} size="large" />
        </div>
      ) : viewMode === 'table' ? (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredDataSource}
          pagination={{ pageSize: 15 }}
          onChange={(pagination, filters, sorter) => {
            console.log('Table params:', pagination, filters, sorter);
          }}
          showSorterTooltip={{
            target: 'sorter-icon',
          }}
        />
      ) : (
        renderCardView()
      )}

      {/* Delete Order Modal */}
      <Modal
        title="Удалить заказ"
        visible={deleteModalVisible}
        onCancel={() => {
          setDeleteModalVisible(false);
          setDeletingOrder(null);
          setDeleteOption(null);
        }}
        onOk={() => {
          handleDeleteOrder(deletingOrder.id, deleteOption);
          setDeleteModalVisible(false);
          setDeletingOrder(null);
          setDeleteOption(null);
        }}
        okText="Удалить"
        cancelText="Отмена"
        okButtonProps={{ disabled: deleteOption === null }}
      >
        <Text>Пожалуйста, выберите причину удаления заказа:</Text>
        <Radio.Group
          onChange={(e) => setDeleteOption(e.target.value)}
          value={deleteOption}
          style={{ marginTop: 16 }}
        >
          <Radio value="wrongOrder">
            Неправильный заказ (восстановить бумагу)
          </Radio>
          <Radio value="canceledOrder">
            Заказ отменен (бумага не восстанавливается)
          </Radio>
        </Radio.Group>
      </Modal>
    </>
  );
};

export default OrderList;

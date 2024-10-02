import React, { useState, useEffect } from 'react';
import {
  Table,
  Select,
  message,
  Typography,
  Badge,
  Radio,
  Card,
  Switch,
  Tabs,
  Spin,
  Button,
  Modal,
} from 'antd';
import {
  UnorderedListOutlined,
  AppstoreOutlined,
  CodeSandboxOutlined,
  CarOutlined,
  LoadingOutlined,
  DeleteOutlined,
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

const { Title, Text } = Typography;
const { TabPane } = Tabs;

const statusOptions = [
  {
    label: 'В процессе',
    value: 'in-progress',
    color: 'orange',
    backgroundColor: '#E6F4FF',
    textColor: '#355A77',
    icon: <CarOutlined />,
  },
  {
    label: 'Доставлено',
    value: 'delivered',
    color: 'green',
    backgroundColor: '#E3F6EB',
    textColor: '#3D8C5C',
    icon: <CarOutlined />,
  },
  {
    label: 'Готов к отправке',
    value: 'ready',
    color: 'blue',
    backgroundColor: '#FDEADC',
    textColor: '#D8844C',
    icon: <CodeSandboxOutlined />,
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
      const ordersQuery = query(ordersRef, orderBy('date', 'desc'));
      const ordersSnapshot = await getDocs(ordersQuery);
      const orders = ordersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDataSource(orders);

      const productsSnapshot = await getDocs(
        collection(db, `organizations/${orgID}/products`)
      );
      const productsData = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsData);

      const categoriesSnapshot = await getDocs(
        collection(db, `organizations/${orgID}/product-categories`)
      );
      const categoriesData = categoriesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(categoriesData);

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
                  (orderData.quantity * selectedProduct.requiredPaper) / 1000000; // grams to kg

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
      }

      // Delete the order document from Firestore
      await deleteDoc(doc(db, `organizations/${organizationID}/orders`, id));

      // Update local state to reflect the deleted order
      setDataSource(dataSource.filter((order) => order.id !== id));

      message.success('Заказ успешно удален');
    } catch (error) {
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
            <Card key={order.id} className="order-card">
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
              <Text style={{ display: 'block', color: '#6B7280' }}>
                {order.client?.companyName || 'Компания не указана'}
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
                    <span style={{ marginLeft: 4 }}>{statusOption.label}</span>
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
              <div className="order-card-switch">
                <Switch
                  checked={
                    role === 'owner'
                      ? order.status === 'delivered'
                      : order.status === 'ready'
                  }
                  onChange={(checked) => {
                    if (role === 'owner') {
                      handleStatusChange(
                        order.id,
                        checked ? 'delivered' : 'ready'
                      );
                    } else {
                      handleStatusChange(
                        order.id,
                        checked ? 'ready' : 'in-progress'
                      );
                    }
                  }}
                  style={{ marginRight: 8 }}
                />
                <Text style={{ color: '#68768C' }}>
                  {role === 'owner'
                    ? order.status === 'delivered'
                      ? 'Доставлено'
                      : 'Изменить на : Доставлено'
                    : order.status === 'ready'
                    ? 'Готов к отгрузке'
                    : 'Изменить на : Готов к отгрузке'}
                </Text>
              </div>
              <Button
                type="link"
                icon={<DeleteOutlined />}
                danger
                onClick={() => {
                  setDeletingOrder(order);
                  setDeleteModalVisible(true);
                }}
                style={{ marginTop: 10 }}
              >
                Удалить
              </Button>
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
      render: (quantity) =>
        quantity ? quantity.toLocaleString('ru-RU') : 'Кол-во не указано',
    },
    ...(role === 'owner'
      ? [
          {
            title: 'ЦЕНА',
            dataIndex: 'price',
            render: (_, record) => {
              if (record.price !== undefined) {
                return (
                  <div style={{ textAlign: 'left' }}>
                    <Text
                      style={{ fontSize: 16, fontWeight: 600, color: '#000' }}
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
      render: (_, record) => {
        const statusOption = statusOptions.find(
          (option) => option.value === record.status
        );
        if (statusOption) {
          return (
            <Select
              placeholder="Выберите статус"
              defaultValue={record.status}
              style={{ width: '100%' }}
              onChange={(value) => handleStatusChange(record.id, value)}
            >
              {statusOptions.map((option) => (
                <Select.Option key={option.value} value={option.value}>
                  <Badge
                    color={option.color}
                    text={
                      <span style={{ marginLeft: '8px' }}>{option.label}</span>
                    }
                  />
                </Select.Option>
              ))}
            </Select>
          );
        }
        return 'Статус не указан';
      },
    },
    {
      title: 'ДЕЙСТВИЕ',
      key: 'action',
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

  const filteredDataSource =
    selectedStatus === 'all'
      ? dataSource
      : dataSource.filter((order) => order.status === selectedStatus);

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
      <Tabs
        defaultActiveKey="all"
        onChange={(key) => setSelectedStatus(key)}
        activeKey={selectedStatus}
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
          pagination={false}
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

import React, { useState, useEffect } from 'react';
import { Typography, Space, Spin, Row, Col, Statistic, Badge } from 'antd';
import ReactApexChart from 'react-apexcharts';
import { useOutletContext } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../components/login-signUp/firebase';
import './Dashboard.css';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { userDetails, organizationID } = useOutletContext();
  const today = new Date();
  const formattedDate = today.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = today.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState({
    series: [],
    labels: [],
  });
  const [totalSales, setTotalSales] = useState(0);
  const [materialSales, setMaterialSales] = useState({}); // State to hold sales per material

  useEffect(() => {
    const fetchOrderData = async () => {
      if (!organizationID) return;

      try {
        // Fetch orders
        const ordersSnapshot = await getDocs(
          collection(db, `organizations/${organizationID}/orders`)
        );
        const orders = ordersSnapshot.docs.map((doc) => doc.data());

        // Fetch products
        const productsSnapshot = await getDocs(
          collection(db, `organizations/${organizationID}/products`)
        );
        const products = productsSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Create a map from productKey to material
        const productMaterialMap = {};
        products.forEach((product) => {
          const key = `${product.categoryId}_${product.id}`;
          productMaterialMap[key] = product.material;
        });

        const productOrderMap = {};
        const materialSalesMap = {};
        let totalQuantity = 0;
        let totalSalesAmount = 0;

        orders.forEach((order) => {
          const productLabel = `${order.product.categoryName} → ${order.product.productTitle}`;
          totalQuantity += order.quantity;
          totalSalesAmount += order.quantity * order.price;

          // Aggregate quantities for the chart
          if (productOrderMap[productLabel]) {
            productOrderMap[productLabel] += order.quantity;
          } else {
            productOrderMap[productLabel] = order.quantity;
          }

          // Get material
          const productKey = `${order.product.categoryId}_${order.product.productId}`;
          const material = productMaterialMap[productKey] || 'Unknown';

          // Sum total sales per material
          const orderTotal = order.quantity * order.price;
          if (materialSalesMap[material]) {
            materialSalesMap[material] += orderTotal;
          } else {
            materialSalesMap[material] = orderTotal;
          }
        });

        // Set chart data
        const series = Object.values(productOrderMap).map(
          (quantity) => (quantity / totalQuantity) * 100
        );
        const labels = Object.keys(productOrderMap);

        setChartData({
          series: series.map((val) => parseFloat(val.toFixed(2))),
          labels,
        });

        setTotalSales(totalSalesAmount);
        setMaterialSales(materialSalesMap);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching orders data:', error);
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [organizationID]);

  // Define badge colors
  const badgeColors = ['#ff4d4f', '#faad14', '#52c41a', '#1890ff', '#13c2c2', '#722ed1'];

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <Space size="large" direction="vertical">
          <Text style={{ color: '#a9a9a9', fontSize: 14 }}>
            Сегодня: {formattedDate} | {formattedTime}
          </Text>
          <Title level={2} style={{ color: '#4d4d4d' }}>
            Добро пожаловать, <span style={{ fontWeight: 'normal' }}>{userDetails?.fullName}</span>
          </Title>
        </Space>
      </header>

      {/* Overview Cards */}
      <div className="overview-cards">
        <Row gutter={16}>
          <Col span={24}>
            <div className="overview-card">
              <Statistic
                title="Общий Объем Заказов (Сум)"
                value={totalSales.toLocaleString('ru-RU')}
                valueStyle={{ fontSize: '32px', fontWeight: 'bold' }}
              />
              {/* Material Sales Details */}
              {Object.keys(materialSales).length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                    {Object.entries(materialSales).map(([material, salesAmount], index) => (
                      <div key={material} style={{ display: 'flex', alignItems: 'center' }}>
                        <Badge color={badgeColors[index % badgeColors.length]} />
                        <Text style={{ color: '#8c8c8c', marginLeft: '8px' }}>
                          {material} : {salesAmount.toLocaleString('ru-RU')} сум
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </div>

      {/* Chart Section */}
      <div className="main-cards">
        <div className="card">
          {loading ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '300px',
              }}
            >
              <Spin tip="Загрузка данных..." />
            </div>
          ) : (
            <div id="chart" className="chart-container">
              <ReactApexChart
                options={{
                  chart: {
                    type: 'donut',
                  },
                  labels: chartData.labels,
                  legend: {
                    position: 'right',
                    fontSize: '14px',
                  },
                  dataLabels: {
                    enabled: true,
                    formatter: (val) => `${val.toFixed(2)}%`,
                  },
                  responsive: [
                    {
                      breakpoint: 480,
                      options: {
                        chart: {
                          width: 250,
                        },
                        legend: {
                          position: 'bottom',
                        },
                      },
                    },
                  ],
                }}
                series={chartData.series}
                type="donut"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

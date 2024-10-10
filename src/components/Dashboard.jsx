import React, { useState, useEffect } from 'react';
import { Typography, Space, Spin } from 'antd';
import { useOutletContext } from 'react-router-dom';
import ReactApexChart from 'react-apexcharts';
import { auth, db } from '../components/login-signUp/firebase';
import { collection, getDocs } from 'firebase/firestore';

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
    quantities: [], // To store order quantities
  });

  // Fetch orders data from Firestore and group by product
  useEffect(() => {
    const fetchOrderData = async () => {
      if (!organizationID) return;

      try {
        const ordersSnapshot = await getDocs(
          collection(db, `organizations/${organizationID}/orders`)
        );
        const orders = ordersSnapshot.docs.map((doc) => doc.data());

        // Group orders by product (productTitle + categoryName)
        const productOrderMap = {};
        const productQuantityMap = {};
        orders.forEach((order) => {
          const productLabel = `${order.product.categoryName} → ${order.product.productTitle}`;
          const quantity = order.quantity || 1;

          if (productOrderMap[productLabel]) {
            productOrderMap[productLabel] += 1;
            productQuantityMap[productLabel] += quantity;
          } else {
            productOrderMap[productLabel] = 1;
            productQuantityMap[productLabel] = quantity;
          }
        });

        // Convert the map to chart series and labels
        const totalOrders = orders.length;
        const series = Object.values(productOrderMap).map(
          (count) => (count / totalOrders) * 100
        );
        const labels = Object.keys(productOrderMap);
        const quantities = Object.values(productQuantityMap);

        setChartData({
          series: series.map((val) => parseFloat(val.toFixed(2))), // 2 digits after the decimal
          labels,
          quantities,
        });

        setLoading(false);
      } catch (error) {
        console.error('Error fetching orders data:', error);
        setLoading(false);
      }
    };

    fetchOrderData();
  }, [organizationID]);

  return (
    <div style={{ padding: 24 }}>
      {/* Welcome section - no shadow */}
      <Space size="large" direction="vertical">
        <Text style={{ color: '#a9a9a9', fontSize: 14 }}>
          Сегодня: {formattedDate} | {formattedTime}
        </Text>
        <Title level={2} style={{ color: '#4d4d4d' }}>
          Добро пожаловать, <span style={{ fontWeight: 'normal' }}>{userDetails?.fullName}</span>
        </Title>
      </Space>

      {/* Chart section with shadow and rounded corners */}
      <div
        style={{
          marginTop: '24px',
          padding: 24,
          background: '#fff',
          borderRadius: 8,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
            <Spin tip="Загрузка данных..." />
          </div>
        ) : (
          <div style={{ padding: 20 }}>
            <div id="chart" style={{ margin: '0 auto', width: '100%', maxWidth: '600px' }}>
              <ReactApexChart
                options={{
                  chart: {
                    type: 'donut',
                  },
                  labels: chartData.labels,
                  legend: {
                    position: 'bottom',
                    fontSize: '14px',
                  },
                  dataLabels: {
                    enabled: true,
                    formatter: (val, opts) => {
                      const quantity = chartData.quantities[opts.seriesIndex];
                      return `${val.toFixed(2)}%\n${quantity} шт`;
                    },
                    style: {
                      fontSize: '12px',
                      fontWeight: 'lighter',
                    },
                  },
                  responsive: [
                    {
                      breakpoint: 480,
                      options: {
                        chart: {
                          width: 300,
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
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

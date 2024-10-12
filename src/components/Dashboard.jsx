// Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Typography, Space, Spin, Row, Col, Badge, Radio } from 'antd';
import ReactApexChart from 'react-apexcharts';
import { useOutletContext } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../components/login-signUp/firebase';
import './Dashboard.css';

const { Title, Text } = Typography;

const Dashboard = () => {
  const { userDetails, organizationID } = useOutletContext();
  const today = new Date();
  const formattedDate = today.toLocaleDateString('ru-RU', {
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
    quantities: [],
  });
  const [totalSales, setTotalSales] = useState(0);
  const [materialSales, setMaterialSales] = useState({});

  // New state variables for area chart
  const [timePeriod, setTimePeriod] = useState('month'); // 'day', 'week', 'month'
  const [areaChartData, setAreaChartData] = useState({ dates: [], values: [] });

  // New state variable for customer sales data
  const [customerSalesData, setCustomerSalesData] = useState({ series: [] });

  useEffect(() => {
    fetchOrderData();
  }, [organizationID, timePeriod]);

  const fetchOrderData = async () => {
    if (!organizationID) return;

    try {
      setLoading(true);

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

      // Fetch customers
      const customersSnapshot = await getDocs(
        collection(db, `organizations/${organizationID}/customers`)
      );
      const customers = customersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Create a map from productKey to material
      const productMaterialMap = {};
      products.forEach((product) => {
        const key = `${product.categoryId}_${product.id}`;
        productMaterialMap[key] = product.material;
      });

      // Create a map from customer ID to customer name
      const customerMap = {};
      customers.forEach((customer) => {
        customerMap[customer.id] =
          customer.brand ||
          customer.companyName ||
          customer.personInCharge ||
          'Неизвестный клиент';
      });

      const productOrderMap = {};
      const materialSalesMap = {};
      const customerSalesMap = {};
      const customerOrderQuantityMap = {};
      let totalQuantity = 0;
      let totalSalesAmount = 0;

      orders.forEach((order) => {
        const productLabel = `${order.product.categoryName} → ${order.product.productTitle}`;
        const quantity = order.quantity;
        totalQuantity += quantity;
        totalSalesAmount += quantity * order.price;

        // Aggregate quantities for the donut chart
        if (productOrderMap[productLabel]) {
          productOrderMap[productLabel] += quantity;
        } else {
          productOrderMap[productLabel] = quantity;
        }

        // Get material
        const productKey = `${order.product.categoryId}_${order.product.productId}`;
        const material = productMaterialMap[productKey] || 'Unknown';

        // Sum total sales per material
        const orderTotal = quantity * order.price;
        if (materialSalesMap[material]) {
          materialSalesMap[material] += orderTotal;
        } else {
          materialSalesMap[material] = orderTotal;
        }

        // Aggregate total sales and quantity per customer
        const customerId = order.client?.id || null;
        if (customerId) {
          if (customerSalesMap[customerId]) {
            customerSalesMap[customerId] += orderTotal;
            customerOrderQuantityMap[customerId] += quantity;
          } else {
            customerSalesMap[customerId] = orderTotal;
            customerOrderQuantityMap[customerId] = quantity;
          }
        }
      });

      // Prepare data for donut chart
      const dataPoints = [];
      Object.entries(productOrderMap).forEach(([label, quantity]) => {
        const percentage = (quantity / totalQuantity) * 100;
        dataPoints.push({
          label,
          quantity,
          percentage: parseFloat(percentage.toFixed(2)),
        });
      });

      // Sort data points by percentage (optional)
      dataPoints.sort((a, b) => b.percentage - a.percentage);

      // Set donut chart data
      setChartData({
        series: dataPoints.map((dp) => dp.percentage),
        labels: dataPoints.map((dp) => dp.label),
        quantities: dataPoints.map((dp) => dp.quantity),
      });

      setTotalSales(totalSalesAmount);
      setMaterialSales(materialSalesMap);

      // Aggregate orders over time for area chart
      let aggregatedData = {};
      let startDate;
      const today = new Date();

      // Determine the start date based on the selected time period
      if (timePeriod === 'day') {
        // Last 30 days
        startDate = new Date();
        startDate.setDate(today.getDate() - 29);
      } else if (timePeriod === 'week') {
        // Last 7 weeks
        startDate = new Date();
        startDate.setDate(today.getDate() - 7 * 6); // Last 7 weeks
      } else if (timePeriod === 'month') {
        // Last 12 months
        startDate = new Date();
        startDate.setMonth(today.getMonth() - 11); // Last 12 months
        startDate.setDate(1); // Set to the first day of the month
      }

      let labels = [];

      if (timePeriod === 'day') {
        // Aggregate daily data for the last 30 days
        let currentDate = new Date(startDate);
        while (currentDate <= today) {
          const dateString = currentDate.toISOString().split('T')[0]; // Format: 'YYYY-MM-DD'
          aggregatedData[dateString] = 0;
          labels.push(dateString);
          currentDate.setDate(currentDate.getDate() + 1);
        }

        orders.forEach((order) => {
          const orderDate = order.date?.toDate() || null;
          if (orderDate) {
            const dateString = orderDate.toISOString().split('T')[0];
            if (aggregatedData[dateString] !== undefined) {
              aggregatedData[dateString] += order.quantity;
            }
          }
        });
      } else if (timePeriod === 'week') {
        // Aggregate weekly data for the last 7 weeks
        const weekStartDates = [];
        let currentStartDate = new Date(startDate);

        while (currentStartDate <= today) {
          const weekStartString = currentStartDate.toISOString().split('T')[0];
          weekStartDates.push(weekStartString);
          aggregatedData[weekStartString] = 0;

          // Move to next week
          currentStartDate.setDate(currentStartDate.getDate() + 7);
        }

        labels = weekStartDates;

        orders.forEach((order) => {
          const orderDate = order.date?.toDate() || null;
          if (orderDate) {
            // Calculate the week start date for this order
            const diffInDays = Math.floor((orderDate - startDate) / (24 * 60 * 60 * 1000));
            const weekNumber = Math.floor(diffInDays / 7);
            const weekStartDate = new Date(startDate);
            weekStartDate.setDate(startDate.getDate() + weekNumber * 7);
            const weekStartString = weekStartDate.toISOString().split('T')[0];

            if (aggregatedData[weekStartString] !== undefined) {
              aggregatedData[weekStartString] += order.quantity;
            }
          }
        });
      } else if (timePeriod === 'month') {
        // Aggregate monthly data for the last 12 months
        const monthStartDates = [];
        let currentMonth = new Date(startDate);

        while (currentMonth <= today) {
          const monthString = `${currentMonth.getFullYear()}-${String(
            currentMonth.getMonth() + 1
          ).padStart(2, '0')}-01`; // Format: 'YYYY-MM-01'
          aggregatedData[monthString] = 0;
          labels.push(monthString);

          // Move to next month
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }

        orders.forEach((order) => {
          const orderDate = order.date?.toDate() || null;
          if (orderDate) {
            const monthString = `${orderDate.getFullYear()}-${String(
              orderDate.getMonth() + 1
            ).padStart(2, '0')}-01`;
            if (aggregatedData[monthString] !== undefined) {
              aggregatedData[monthString] += order.quantity;
            }
          }
        });
      }

      const chartDates = labels;
      const chartValues = labels.map((label) => aggregatedData[label]);

      setAreaChartData({
        dates: chartDates,
        values: chartValues,
      });

      // Prepare data for customer sales chart
      const customerSalesArray = [];

      customers.forEach((customer) => {
        const customerId = customer.id;
        const salesAmount = customerSalesMap[customerId] || 0;
        const totalQuantity = customerOrderQuantityMap[customerId] || 0;
        if (salesAmount > 0) {
          const customerName = customer.brand || 'Неизвестный клиент';
          const companyName = customer.companyName || 'N/A';
          customerSalesArray.push({
            customerId,
            customerName,
            companyName,
            salesAmount,
            totalQuantity,
          });
        }
      });

      // Sort by sales amount descending
      customerSalesArray.sort((a, b) => b.salesAmount - a.salesAmount);

      // Optionally, limit to top N customers (e.g., top 10)
      const topCustomers = customerSalesArray.slice(0, 10);

      const customerSeriesData = topCustomers.map((item) => ({
        x: item.customerName,
        y: item.salesAmount,
        companyName: item.companyName,
        totalQuantity: item.totalQuantity,
      }));

      setCustomerSalesData({
        series: [
          {
            data: customerSeriesData,
          },
        ],
      });

      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders data:', error);
      setLoading(false);
    }
  };

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
            Добро пожаловать,{' '}
            <span style={{ fontWeight: 'normal' }}>{userDetails?.fullName}</span>
          </Title>
        </Space>
      </header>

      {/* Overview Cards */}
      <div className="overview-cards">
        <Row gutter={16}>
          <Col span={24}>
            <div className="overview-card">
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '300',
                    marginBottom: '10px',
                    color: '#8c8c8c',
                  }}
                >
                  Общий Объем Заказов
                </div>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 'bold',
                    marginBottom: '12px',
                    color: '#4d4d4d',
                  }}
                >
                  {totalSales.toLocaleString('ru-RU')}
                  <span
                    style={{
                      fontSize: '18px',
                      fontWeight: 'normal',
                      color: '#595959',
                      marginLeft: '8px',
                    }}
                  >
                    UZS
                  </span>
                </div>
              </div>

              {/* Material Sales Details */}
              {Object.keys(materialSales).length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
                    {Object.entries(materialSales).map(([material, salesAmount], index) => (
                      <div key={material} style={{ display: 'flex', alignItems: 'center' }}>
                        <Badge color={badgeColors[index % badgeColors.length]} />
                        <div style={{ fontSize: '16px', marginLeft: '8px' }}>
                          <span style={{ color: '#8c8c8c' }}>{material}</span> :{' '}
                          <span
                            style={{
                              color: '#4d4d4d',
                              fontWeight: '600',
                              marginLeft: '4px',
                            }}
                          >
                            {salesAmount.toLocaleString('ru-RU')} сум
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Col>
        </Row>
      </div>

      {/* Area Chart Section */}
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
            <>
              <div id="area-chart" className="chart-container">
                <div style={{ marginBottom: '16px' }}>
                  <Radio.Group value={timePeriod} onChange={(e) => setTimePeriod(e.target.value)}>
                    <Radio.Button value="day">День</Radio.Button>
                    <Radio.Button value="week">Неделя</Radio.Button>
                    <Radio.Button value="month">Месяц</Radio.Button>
                  </Radio.Group>
                </div>
                <ReactApexChart
                  options={{
                    chart: {
                      type: 'area',
                      height: 350,
                      zoom: {
                        enabled: false,
                      },
                    },
                    colors: ['#1890ff'], // Primary blue color
                    dataLabels: {
                      enabled: false,
                    },
                    stroke: {
                      curve: 'smooth',
                    },
                    title: {
                      text: 'Количество заказов за период',
                      align: 'left',
                    },
                    xaxis: {
                      type: 'datetime',
                      categories: areaChartData.dates,
                      labels: {
                        format: timePeriod === 'month' ? 'MMM yyyy' : 'dd MMM',
                      },
                    },
                    yaxis: {
                      title: {
                        text: 'Количество заказов',
                        style: {
                          color: '#bfbfbf',
                          fontWeight: '300',
                        },
                      },
                      labels: {
                        formatter: function (value) {
                          return Number(value).toLocaleString('ru-RU');
                        },
                      },
                    },
                    tooltip: {
                      x: {
                        format: timePeriod === 'month' ? 'MMM yyyy' : 'dd MMM yyyy',
                      },
                      y: {
                        formatter: function (value) {
                          return Number(value).toLocaleString('ru-RU');
                        },
                      },
                    },
                  }}
                  series={[
                    {
                      name: 'Заказы',
                      data: areaChartData.values,
                    },
                  ]}
                  type="area"
                  height={350}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* New Charts Section */}
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
            <div id="donut-chart" className="chart-container">
              <ReactApexChart
                options={{
                  chart: {
                    type: 'donut',
                    toolbar: {
                      show: true,
                      export: {
                        csv: {
                          headerCategory: 'Категория',
                          headerValue: 'Значение',
                        },
                        menu: {
                          svg: 'Скачать SVG',
                          png: 'Скачать PNG',
                          csv: 'Скачать CSV',
                        },
                      },
                    },
                  },
                  labels: chartData.labels,
                  legend: {
                    position: 'right',
                    fontSize: '14px',
                  },
                  dataLabels: {
                    enabled: true,
                    formatter: function (val, opts) {
                      return `${val.toFixed(2)}%`;
                    },
                  },
                  tooltip: {
                    y: {
                      formatter: function (val, { series, seriesIndex, dataPointIndex, w }) {
                        const quantity = chartData.quantities[seriesIndex];
                        return `${quantity.toLocaleString('ru-RU')} шт`;
                      },
                    },
                  },
                  responsive: [
                    {
                      breakpoint: 768,
                      options: {
                        chart: {
                          width: '100%',
                        },
                        legend: {
                          position: 'bottom',
                        },
                      },
                    },
                  ],
                  title: {
                    text: 'Продажи по продуктам',
                    align: 'left',
                  },
                }}
                series={chartData.series}
                type="donut"
                height={350}
              />
            </div>
          )}
        </div>

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
            <div id="bar-chart" className="chart-container">
              <ReactApexChart
                options={{
                  chart: {
                    type: 'bar',
                    height: 350,
                    toolbar: {
                      show: true,
                      export: {
                        csv: {
                          headerCategory: 'Категория',
                          headerValue: 'Значение',
                        },
                        menu: {
                          svg: 'Скачать SVG',
                          png: 'Скачать PNG',
                          csv: 'Скачать CSV',
                        },
                      },
                    },
                  },
                  plotOptions: {
                    bar: {
                      horizontal: true,
                      barHeight: '70%',
                    },
                  },
                  dataLabels: {
                    enabled: false,
                  },
                  xaxis: {
                    labels: {
                      formatter: function (value) {
                        return Number(value).toLocaleString('ru-RU');
                      },
                    },
                    title: {
                      text: 'Продажи (UZS)',
                      style: {
                        color: '#bfbfbf',
                        fontWeight: '300',
                      },
                    },
                  },
                  yaxis: {
                    labels: {
                      style: {
                        fontSize: '12px',
                      },
                    },
                  },
                  tooltip: {
                    custom: function ({ series, seriesIndex, dataPointIndex, w }) {
                      const data = w.globals.initialSeries[seriesIndex].data[dataPointIndex];
                      return (
                        '<div class="arrow_box">' +
                        '<strong>' +
                        data.companyName +
                        '</strong><br/>' +
                        '<span>Объем продаж: ' +
                        Number(data.y).toLocaleString('ru-RU') +
                        ' UZS</span><br/>' +
                        '<span>Объем заказов: ' +
                        data.totalQuantity +
                        '</span>' +
                        '</div>'
                      );
                    },
                  },
                  title: {
                    text: 'Топ клиентов по продажам',
                    align: 'left',
                  },
                }}
                series={customerSalesData.series}
                type="bar"
                height={350}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

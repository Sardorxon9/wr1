import React, { useState, useEffect } from 'react';
import { Typography, Space, Spin, Radio, DatePicker } from 'antd';
import ReactApexChart from 'react-apexcharts';
import { useOutletContext } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../components/login-signUp/firebase';
import './Dashboard.css';
import moment from 'moment';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

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

  // Data states
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);

  // Chart data states
  const [chartData, setChartData] = useState({
    series: [],
    labels: [],
    quantities: [],
  });
  const [areaChartData, setAreaChartData] = useState([]);
  const [customerSalesData, setCustomerSalesData] = useState({ series: [] });

  // Date range states
  const [areaChartDateRange, setAreaChartDateRange] = useState(null);
  const [donutChartDateRange, setDonutChartDateRange] = useState(null);
  const [barChartDateRange, setBarChartDateRange] = useState(null);

  // Time period state for area chart
  const [timePeriod, setTimePeriod] = useState('month'); // 'day', 'week', 'month'

  // Aggregation interval state
  const [aggregationInterval, setAggregationInterval] = useState('month');

  useEffect(() => {
    fetchOrderData();
  }, [organizationID]);

  useEffect(() => {
    if (!orders.length || !products.length || !customers.length) return;
    processAreaChartData();
  }, [orders, products, customers, areaChartDateRange, timePeriod]);

  useEffect(() => {
    if (!orders.length || !products.length) return;
    processDonutChartData();
  }, [orders, products, donutChartDateRange]);

  useEffect(() => {
    if (!orders.length || !customers.length) return;
    processBarChartData();
  }, [orders, customers, barChartDateRange]);

  const fetchOrderData = async () => {
    if (!organizationID) return;

    try {
      setLoading(true);
      // Fetch orders
      const ordersSnapshot = await getDocs(
        collection(db, `organizations/${organizationID}/orders`)
      );
      const fetchedOrders = ordersSnapshot.docs.map((doc) => doc.data());
      setOrders(fetchedOrders);

      // Fetch products
      const productsSnapshot = await getDocs(
        collection(db, `organizations/${organizationID}/products`)
      );
      const fetchedProducts = productsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(fetchedProducts);

      // Fetch customers
      const customersSnapshot = await getDocs(
        collection(db, `organizations/${organizationID}/customers`)
      );
      const fetchedCustomers = customersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCustomers(fetchedCustomers);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders data:', error);
      setLoading(false);
    }
  };

  const processAreaChartData = () => {
    let filteredOrders = orders;
    let startDate, endDate;

    if (Array.isArray(areaChartDateRange) && areaChartDateRange[0] && areaChartDateRange[1]) {
      // Use the specified date range from date pickers
      const [startMoment, endMoment] = areaChartDateRange;
      startDate = startMoment.startOf('day').toDate();
      endDate = endMoment.endOf('day').toDate();
    } else {
      // Use default date range based on timePeriod
      const today = new Date();

      if (timePeriod === 'day') {
        startDate = new Date();
        startDate.setDate(today.getDate() - 29);
        endDate = today;
      } else if (timePeriod === 'week') {
        startDate = new Date();
        startDate.setDate(today.getDate() - 7 * 6);
        endDate = today;
      } else if (timePeriod === 'month') {
        startDate = new Date();
        startDate.setMonth(today.getMonth() - 11);
        startDate.setDate(1);
        endDate = today;
      } else {
        // Default to last 12 months
        startDate = new Date();
        startDate.setMonth(today.getMonth() - 11);
        startDate.setDate(1);
        endDate = today;
      }
    }

    // Filter orders within the date range
    filteredOrders = orders.filter((order) => {
      const orderDate = order.date?.toDate() || null;
      return orderDate >= startDate && orderDate <= endDate;
    });

    // Determine aggregation interval
    const diffInDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    let aggInterval;

    if (Array.isArray(areaChartDateRange) && areaChartDateRange[0] && areaChartDateRange[1]) {
      // If date range is specified, adjust aggregation based on range
      if (diffInDays <= 31) {
        aggInterval = 'day';
      } else if (diffInDays <= 180) {
        aggInterval = 'week';
      } else if (diffInDays <= 365 * 2) {
        aggInterval = 'month';
      } else {
        aggInterval = 'year';
      }
    } else {
      // Use timePeriod for aggregation
      aggInterval = timePeriod;
    }

    setAggregationInterval(aggInterval);

    let aggregatedData = {};
    let labels = [];

    if (aggInterval === 'day') {
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        aggregatedData[dateString] = 0;
        labels.push(dateString);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      filteredOrders.forEach((order) => {
        const orderDate = order.date?.toDate() || null;
        if (orderDate) {
          const dateString = orderDate.toISOString().split('T')[0];
          if (aggregatedData[dateString] !== undefined) {
            aggregatedData[dateString] += order.quantity;
          }
        }
      });
    } else if (aggInterval === 'week') {
      let currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() - currentDate.getDay()); // Set to start of the week

      while (currentDate <= endDate) {
        const weekString = currentDate.toISOString().split('T')[0];
        aggregatedData[weekString] = 0;
        labels.push(weekString);
        currentDate.setDate(currentDate.getDate() + 7);
      }

      filteredOrders.forEach((order) => {
        const orderDate = order.date?.toDate() || null;
        if (orderDate) {
          const weekStart = new Date(orderDate);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay());
          const weekString = weekStart.toISOString().split('T')[0];
          if (aggregatedData[weekString] !== undefined) {
            aggregatedData[weekString] += order.quantity;
          }
        }
      });
    } else if (aggInterval === 'month') {
      let currentMonth = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      while (currentMonth <= endDate) {
        const monthString = currentMonth.toISOString().split('T')[0];
        aggregatedData[monthString] = 0;
        labels.push(monthString);
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }

      filteredOrders.forEach((order) => {
        const orderDate = order.date?.toDate() || null;
        if (orderDate) {
          const monthStart = new Date(orderDate.getFullYear(), orderDate.getMonth(), 1);
          const monthString = monthStart.toISOString().split('T')[0];
          if (aggregatedData[monthString] !== undefined) {
            aggregatedData[monthString] += order.quantity;
          }
        }
      });
    } else if (aggInterval === 'year') {
      let currentYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      while (currentYear <= endYear) {
        const yearString = `${currentYear}-01-01`;
        aggregatedData[yearString] = 0;
        labels.push(yearString);
        currentYear++;
      }

      filteredOrders.forEach((order) => {
        const orderDate = order.date?.toDate() || null;
        if (orderDate) {
          const yearString = `${orderDate.getFullYear()}-01-01`;
          if (aggregatedData[yearString] !== undefined) {
            aggregatedData[yearString] += order.quantity;
          }
        }
      });
    }

    const chartData = labels.map((label) => ({
      x: new Date(label),
      y: aggregatedData[label],
    }));

    setAreaChartData(chartData);
  };

  const processDonutChartData = () => {
    let filteredOrders = orders;
    let startDate, endDate;

    if (Array.isArray(donutChartDateRange) && donutChartDateRange[0] && donutChartDateRange[1]) {
      // Use the specified date range from date pickers
      const [startMoment, endMoment] = donutChartDateRange;
      startDate = startMoment.startOf('day').toDate();
      endDate = endMoment.endOf('day').toDate();
    } else {
      // If no date range is specified, include all dates
      startDate = new Date(0); // Beginning of time
      endDate = new Date(); // Today
    }

    // Filter orders within the date range
    filteredOrders = orders.filter((order) => {
      const orderDate = order.date?.toDate() || null;
      return orderDate >= startDate && orderDate <= endDate;
    });

    // Map productKey to material
    const productMaterialMap = {};
    products.forEach((product) => {
      const key = `${product.categoryId}_${product.id}`;
      productMaterialMap[key] = product.material;
    });

    // Proceed to process the filteredOrders for donut chart

    const productOrderMap = {};
    let totalQuantity = 0;

    filteredOrders.forEach((order) => {
      const productLabel = `${order.product.categoryName} → ${order.product.productTitle}`;
      const quantity = order.quantity;
      totalQuantity += quantity;

      // Aggregate quantities for the donut chart
      if (productOrderMap[productLabel]) {
        productOrderMap[productLabel] += quantity;
      } else {
        productOrderMap[productLabel] = quantity;
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

    // Sort data points by percentage
    dataPoints.sort((a, b) => b.percentage - a.percentage);

    // Set donut chart data
    setChartData({
      series: dataPoints.map((dp) => dp.percentage),
      labels: dataPoints.map((dp) => dp.label),
      quantities: dataPoints.map((dp) => dp.quantity),
    });
  };

  const processBarChartData = () => {
    let filteredOrders = orders;
    let startDate, endDate;

    if (Array.isArray(barChartDateRange) && barChartDateRange[0] && barChartDateRange[1]) {
      // Use the specified date range from date pickers
      const [startMoment, endMoment] = barChartDateRange;
      startDate = startMoment.startOf('day').toDate();
      endDate = endMoment.endOf('day').toDate();
    } else {
      // If no date range is specified, include all dates
      startDate = new Date(0); // Beginning of time
      endDate = new Date(); // Today
    }

    // Filter orders within the date range
    filteredOrders = orders.filter((order) => {
      const orderDate = order.date?.toDate() || null;
      return orderDate >= startDate && orderDate <= endDate;
    });

    // Create customer map
    const customerMap = {};
    customers.forEach((customer) => {
      customerMap[customer.id] =
        customer.brand ||
        customer.companyName ||
        customer.personInCharge ||
        'Неизвестный клиент';
    });

    // Proceed to process the filteredOrders for bar chart

    const customerSalesMap = {};
    const customerOrderQuantityMap = {};

    filteredOrders.forEach((order) => {
      const quantity = order.quantity;
      const orderTotal = quantity * order.price;

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

    // Limit to top N customers
    const topCustomers = customerSalesArray.slice(0, 10);

    const customerSeriesData = topCustomers.map((item) => ({
      x: shortenText(item.customerName),
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
  };

  // Function to format large numbers for mobile
  const formatNumber = (num) => {
    if (window.innerWidth < 480) {
      if (num >= 1e6) return `${(num / 1e6).toFixed(1)} млн`;
      if (num >= 1e3) return `${(num / 1e3).toFixed(1)} тыс`;
    }
    return num.toLocaleString('ru-RU');
  };

  // Function to format date for mobile
  const formatDateForMobile = (date) => {
    const dt = new Date(date);
    if (window.innerWidth < 480) {
      return `${('0' + (dt.getMonth() + 1)).slice(-2)}.${dt
        .getFullYear()
        .toString()
        .slice(-2)}`;
    }
    return dt.toLocaleDateString('ru-RU', {
      month: 'long',
      year: 'numeric',
    });
  };

  // Function to format date labels based on aggregation
  const formatDateLabel = (date) => {
    const dt = new Date(date);
    if (aggregationInterval === 'day') {
      return dt.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
      });
    } else if (aggregationInterval === 'week') {
      const weekStart = new Date(dt);
      const weekEnd = new Date(dt);
      weekEnd.setDate(weekEnd.getDate() + 6);
      return `${weekStart.getDate()}-${weekEnd.getDate()} ${weekStart.toLocaleDateString(
        'ru-RU',
        {
          month: 'short',
        }
      )}`;
    } else if (aggregationInterval === 'month') {
      return dt.toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric',
      });
    } else if (aggregationInterval === 'year') {
      return dt.getFullYear();
    }
  };

  // Function to format tooltip date as 'yyyy.MM.dd'
  const formatTooltipDate = (value) => {
    const date = new Date(value);
    const year = date.getFullYear();
    const month = (`0${date.getMonth() + 1}`).slice(-2);
    const day = (`0${date.getDate()}`).slice(-2);
    return `${year}.${month}.${day}`;
  };

  // Function to shorten the text with ellipsis
  const shortenText = (text, maxLength = 10) => {
    return window.innerWidth < 480 && text.length > maxLength
      ? `${text.substring(0, maxLength)}...`
      : text;
  };

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
              {orders
                .reduce((acc, order) => acc + order.quantity * order.price, 0)
                .toLocaleString('ru-RU')}
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
        </div>
      </div>

      {/* Main Cards */}
      <div className="main-cards">
        {/* Area Chart Card */}
        <div className="card full-width">
          {loading ? (
            <div className="loading-spinner">
              <Spin tip="Загрузка данных..." />
            </div>
          ) : (
            <>
              <div style={{ marginBottom: '16px' }}>
                <RangePicker
                  onChange={(dates) => {
                    setAreaChartDateRange(dates);
                    // Ignore timePeriod when date range is selected
                    if (Array.isArray(dates) && dates[0] && dates[1]) {
                      setTimePeriod(null);
                    } else {
                      setTimePeriod('month'); // Reset to default
                    }
                  }}
                  value={areaChartDateRange}
                  style={{ marginRight: '16px' }}
                />
                {!areaChartDateRange && (
                  <Radio.Group
                    value={timePeriod}
                    onChange={(e) => setTimePeriod(e.target.value)}
                  >
                    <Radio.Button value="day">День</Radio.Button>
                    <Radio.Button value="week">Неделя</Radio.Button>
                    <Radio.Button value="month">Месяц</Radio.Button>
                  </Radio.Group>
                )}
              </div>
              <div id="area-chart" className="chart-container">
                <ReactApexChart
                  options={{
                    chart: {
                      type: 'area',
                      height: 350,
                      zoom: {
                        enabled: false,
                      },
                      locales: [
                        {
                          name: 'ru',
                          options: {
                            toolbar: {
                              exportToSVG: 'Скачать SVG',
                              exportToPNG: 'Скачать PNG',
                              exportToCSV: 'Скачать CSV',
                              menu: 'Меню',
                            },
                          },
                        },
                      ],
                      defaultLocale: 'ru',
                    },
                    colors: ['#1890ff'],
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
                      labels: {
                        formatter: (value) => formatDateLabel(value),
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
                        formatter: (value) => formatNumber(value),
                      },
                    },
                    tooltip: {
                      x: {
                        formatter: (value) => formatTooltipDate(value),
                      },
                      y: {
                        formatter: (value) => formatNumber(value),
                      },
                    },
                  }}
                  series={[
                    {
                      name: 'Заказы',
                      data: areaChartData,
                    },
                  ]}
                  type="area"
                  height={350}
                />
              </div>
            </>
          )}
        </div>

        {/* Donut and Bar Chart Card */}
        <div className="flex-row">
          {/* Donut Chart */}
          <div className="card half-width">
            {loading ? (
              <div className="loading-spinner">
                <Spin tip="Загрузка данных..." />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <RangePicker
                    onChange={(dates) => setDonutChartDateRange(dates)}
                    value={donutChartDateRange}
                  />
                </div>
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
                        locales: [
                          {
                            name: 'ru',
                            options: {
                              toolbar: {
                                exportToSVG: 'Скачать SVG',
                                exportToPNG: 'Скачать PNG',
                                exportToCSV: 'Скачать CSV',
                                menu: 'Меню',
                              },
                            },
                          },
                        ],
                        defaultLocale: 'ru',
                      },
                      labels: chartData.labels.map((label) => shortenText(label)),
                      legend: {
                        position: 'right',
                        fontSize: '14px',
                      },
                      dataLabels: {
                        enabled: true,
                        formatter: (val, opts) => `${val.toFixed(2)}%`,
                      },
                      tooltip: {
                        y: {
                          formatter: (val, { series, seriesIndex }) => {
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
              </>
            )}
          </div>

          {/* Bar Chart */}
          <div className="card half-width">
            {loading ? (
              <div className="loading-spinner">
                <Spin tip="Загрузка данных..." />
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <RangePicker
                    onChange={(dates) => setBarChartDateRange(dates)}
                    value={barChartDateRange}
                  />
                </div>
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
                        locales: [
                          {
                            name: 'ru',
                            options: {
                              toolbar: {
                                exportToSVG: 'Скачать SVG',
                                exportToPNG: 'Скачать PNG',
                                exportToCSV: 'Скачать CSV',
                                menu: 'Меню',
                              },
                            },
                          },
                        ],
                        defaultLocale: 'ru',
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
                          formatter: (value) => formatNumber(value),
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
                        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
                          const data =
                            w.globals.initialSeries[seriesIndex].data[dataPointIndex];
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
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

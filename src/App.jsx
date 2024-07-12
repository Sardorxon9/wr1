import React from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import LoginPage from './components/login-signUp/loginPage';
import RegistrationOwner from './components/login-signUp/registrationOwner';
import SuccessPage from './components/login-signUp/successPage';
import MainPage from './components/main-page/mainPage';
import Dashboard from './components/Dashboard';
import CreateOrder from './components/order-pages/CreateOrder';
import OrderList from './components/order-pages/OrderList'; // Ensure case sensitivity
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationOwner />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/mainpage" element={<MainPage />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="create-order" element={<CreateOrder />} />
          <Route path="order-list" element={<OrderList />} /> {/* Add this route */}
        </Route>
      </Routes>
    </Router>
  );
}

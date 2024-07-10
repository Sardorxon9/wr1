// App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginPage from './components/login-signUp/loginPage';
import RegistrationOwner from './components/login-signUp/registrationOwner';
import SuccessPage from './components/login-signUp/successPage';
import MainPage from './components/main-page/mainPage';
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationOwner />} />
        <Route path="/success" element={<SuccessPage />} />
        <Route path="/mainpage" element={<MainPage />} />
      </Routes>
    </Router>
  );
}

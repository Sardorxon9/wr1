// App.jsx
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LoginPage from './components/loginPage';
import RegistrationOwner from './components/registrationOwner';
import SuccessPage from './components/successPage';
import './App.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationOwner />} />
        <Route path="/success" element={<SuccessPage />} />
      </Routes>
    </Router>
  );
}

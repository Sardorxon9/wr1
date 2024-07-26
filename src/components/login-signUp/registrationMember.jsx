import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { useLocation } from 'react-router-dom';
import { signInWithEmailLink, updatePassword } from 'firebase/auth';
import { auth, db } from '../login-signUp/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import './registrationMember.css';

const { Title } = Typography;

const RegistrationMember = () => {
  const [form] = Form.useForm();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [organizationID, setOrganizationID] = useState('');
  const [role, setRole] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const email = params.get('email');
    const organizationID = params.get('organizationID');
    const role = params.get('role');
    setEmail(email);
    setOrganizationID(organizationID);
    setRole(role);
  }, [location.search]);

  const handleRegister = async (values) => {
    const { firstName, lastName, password } = values;
    try {
      if (auth.isSignInWithEmailLink(window.location.href)) {
        const result = await signInWithEmailLink(auth, email, window.location.href);
        if (result.user.emailVerified) {
          await updatePassword(result.user, password);
          await updateDoc(doc(db, `organizations/${organizationID}/employees`, result.user.uid), {
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`,
            signedUp: true,
            role,
          });
          message.success('Регистрация прошла успешно!');
        }
      }
    } catch (error) {
      message.error('Ошибка регистрации: ' + error.message);
    }
  };

  return (
    <div className="registration-member-container">
      <div className="form-container">
        <Title level={2}>Регистрация</Title>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleRegister}
        >
          <Form.Item name="firstName" label="Имя" rules={[{ required: true, message: 'Пожалуйста, введите ваше имя!' }]}>
            <Input placeholder="Ваше имя" />
          </Form.Item>
          <Form.Item name="lastName" label="Фамилия" rules={[{ required: true, message: 'Пожалуйста, введите вашу фамилию!' }]}>
            <Input placeholder="Ваша фамилия" />
          </Form.Item>
          <Form.Item name="password" label="Пароль" rules={[{ required: true, message: 'Пожалуйста, введите ваш пароль!' }]}>
            <Input.Password placeholder="Пароль" />
          </Form.Item>
          <Form.Item name="confirmPassword" label="Повторите пароль" dependencies={['password']} rules={[{ required: true, message: 'Пожалуйста, повторите ваш пароль!' }, ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('password') === value) {
                return Promise.resolve();
              }
              return Promise.reject(new Error('Пароли не совпадают!'));
            },
          })]}>
            <Input.Password placeholder="Повторите пароль" />
          </Form.Item>
          <Form.Item name="organization" label="Организация" initialValue={organizationID}>
            <Input disabled />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">Регистрация</Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default RegistrationMember;

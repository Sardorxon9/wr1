import React, { useState } from 'react';
import { Form, Input, Button, Typography, Spin, notification } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db, createOrganization } from './firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore'; // Correct import here
import './registrationOwner.css';

const { Title } = Typography;

const RegistrationOwner = () => {
  const [loading, setLoading] = useState(false);
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [organization, setOrganization] = useState("");

  const navigate = useNavigate(); 

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      // Create a new user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      if (user) {
        // Create the organization document in Firestore
        const organizationData = {
          name: values.organization,
        };

        // Create organization in Firestore and get the organization ID
        const orgID = await createOrganization(user.uid, organizationData);

        // Define subcollections (paper-control and agencies included)
        const subCollections = ['members', 'products', 'product-categories', 'orders', 'business-details', 'customers', 'inventory', 'paper-control', 'agencies'];

        // Ensure subcollections are created (using dummy docs)
        subCollections.forEach(async subCol => {
          const subColRef = collection(db, `organizations/${orgID}/${subCol}`);
          await setDoc(doc(subColRef), {});  // Creating dummy document to initialize the subcollections
        });

        // Create the owner user data in Firestore
        const ownerUserData = {
          userID: user.uid,
          fullName: `${values.firstName} ${values.lastName}`,
          email: values.email,
          dateAccountCreated: serverTimestamp(),
          organization: values.organization,
          organizationID: orgID,
        };

        // Save owner user data in the "owner-users" collection
        await setDoc(doc(db, 'owner-users', user.uid), ownerUserData);

        // Success notification
        notification.success({
          message: 'Регистрация успешна',
          description: 'Вы успешно зарегистрированы!',
        });

        // Navigate to home or dashboard
        navigate("/");
      }
    } catch (error) {
      notification.error({
        message: 'Ошибка регистрации',
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <div className="main-container">
      <div className="left-container">
        <div className="content-container">
          <div className="signup-container">
            <div className="header-container">
              <Link to="/" className="back-link">
                <ArrowLeftOutlined className="back-icon" />
              </Link>
              <Title className="signup-text" level={2}>Регистрация</Title>
            </div>
            <Spin spinning={loading}>
              <Form
                name="signup"
                initialValues={{ remember: true }}
                onFinish={handleRegister}
                onFinishFailed={onFinishFailed}
                layout="vertical"
              >
                <Form.Item
                  label="Имя"
                  name="firstName"
                  rules={[{ required: true, message: 'Пожалуйста, введите ваше имя!' }]}
                >
                  <Input placeholder="Ваше имя" onChange={(e) => setFname(e.target.value)} />
                </Form.Item>

                <Form.Item
                  label="Фамилия"
                  name="lastName"
                  rules={[{ required: true, message: 'Пожалуйста, введите вашу фамилию!' }]}
                >
                  <Input placeholder="Ваша фамилия" onChange={(e) => setLname(e.target.value)} />
                </Form.Item>

                <Form.Item
                  label="Email"
                  name="email"
                  type="email"
                  rules={[{ required: true, message: 'Пожалуйста, введите ваш email!' }]}
                >
                  <Input type="email" placeholder="email" onChange={(e) => setEmail(e.target.value)} />
                </Form.Item>

                <Form.Item
                  label="Пароль"
                  name="password"
                  rules={[{ required: true, message: 'Пожалуйста, введите ваш пароль!' }]}
                >
                  <Input.Password placeholder="Пароль" onChange={(e) => setPassword(e.target.value)} />
                </Form.Item>

                <Form.Item
                  label="Повторите пароль"
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[{ required: true, message: 'Пожалуйста, повторите ваш пароль!' }, ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('Пароли не совпадают!'));
                    },
                  })]}
                >
                  <Input.Password placeholder="Повторите пароль" />
                </Form.Item>

                <Form.Item
                  label="Организация"
                  name="organization"
                  rules={[{ required: true, message: 'Пожалуйста, введите вашу организацию!' }]}
                >
                  <Input placeholder="Организация" onChange={(e) => setOrganization(e.target.value)} />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" className="signup-button">Регистрация</Button>
                </Form.Item>
              </Form>
            </Spin>
          </div>
        </div>
      </div>
      <div className="right-container"></div>
    </div>
  );
};

export default RegistrationOwner;

// LoginPage.jsx

import React from 'react';
import { Form, Input, Button, Typography, Spin, Checkbox, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth';
import { auth, db } from './firebase';
import { getDoc, doc, collection, getDocs } from 'firebase/firestore';
import { LoadingOutlined } from '@ant-design/icons';
import './loginPage.css';

const { Title } = Typography;

const LoginPage = () => {
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();

  const handleLogin = async (values) => {
    setLoading(true); // Start loading
    try {
      // Set persistence based on "Keep me logged in"
      const persistence = values.remember
        ? browserLocalPersistence
        : browserSessionPersistence;
      await setPersistence(auth, persistence);

      const userCredential = await signInWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;

      // Check if the user is an owner
      const ownerDocRef = doc(db, 'owner-users', user.uid);
      const ownerDocSnap = await getDoc(ownerDocRef);
      if (ownerDocSnap.exists()) {
        const ownerData = ownerDocSnap.data();
        navigate('/mainpage/dashboard', {
          replace: true,
          state: { organizationID: ownerData.organizationID, role: 'owner' },
        });
      } else {
        // User is not an owner, check if they are a member
        let isMember = false;
        const organizationsRef = collection(db, 'organizations');
        const orgsSnapshot = await getDocs(organizationsRef);
        for (const orgDoc of orgsSnapshot.docs) {
          const orgID = orgDoc.id;
          const memberDocRef = doc(
            db,
            `organizations/${orgID}/members`,
            user.uid
          );
          const memberDocSnap = await getDoc(memberDocRef);

          if (memberDocSnap.exists()) {
            const memberData = memberDocSnap.data();
            if (memberData.role === 'member') {
              navigate('/mainpage/dashboard', {
                replace: true,
                state: {
                  organizationID: orgID,
                  role: 'member',
                },
              });
              isMember = true;
              break;
            }
          }
        }

        if (!isMember) {
          console.error('No such user in owner-users or members');
          message.error('Пользователь не найден.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      // Handle specific Firebase auth errors
      switch (error.code) {
        case 'auth/invalid-email':
          message.error('Неверный формат email.');
          break;
        case 'auth/user-disabled':
          message.error('Этот пользователь отключен.');
          break;
        case 'auth/user-not-found':
          message.error('Пользователь с таким email не найден.');
          break;
        case 'auth/wrong-password':
          message.error('Неверный пароль.');
          break;
        default:
          message.error('Ошибка при входе. Пожалуйста, попробуйте снова.');
      }
    } finally {
      setLoading(false); // Stop loading
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <div className="main-container">
      <div className="left-container">
        <div className="login-container">
          <Spin
            spinning={loading}
            indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />}
            size="large"
          >
            <Title className="login-text" level={2}>
              Войти
            </Title>
            <Form
              name="login"
              initialValues={{ remember: true }}
              onFinish={handleLogin}
              onFinishFailed={onFinishFailed}
              layout="vertical"
            >
              <Form.Item
                label="Имя пользователя"
                name="email"
                rules={[
                  {
                    required: true,
                    message: 'Пожалуйста, введите ваш email!',
                  },
                  {
                    type: 'email',
                    message: 'Пожалуйста, введите корректный email!',
                  },
                ]}
              >
                <Input placeholder="email" />
              </Form.Item>

              <Form.Item
                label="Пароль"
                name="password"
                rules={[
                  {
                    required: true,
                    message: 'Пожалуйста, введите ваш пароль!',
                  },
                ]}
              >
                <Input.Password placeholder="пароль" />
              </Form.Item>

              <Form.Item name="remember" valuePropName="checked">
                <Checkbox>Оставаться в системе</Checkbox>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="login-button"
                  block
                >
                  Логин
                </Button>
              </Form.Item>
            </Form>
            <div className="button-text">
              <Button
                type="link"
                onClick={() => navigate('/signup-options')}
                className="registration-button"
                block
              >
                Регистрация
              </Button>
            </div>
          </Spin>
        </div>
      </div>
      <div className="right-container" />
    </div>
  );
};

export default LoginPage;
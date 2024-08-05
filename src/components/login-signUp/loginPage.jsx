import React, { useState } from 'react';
import { Form, Input, Button, Typography, Card, Row, Col, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebase';
import { getDoc, doc, collection, getDocs } from "firebase/firestore";
import './loginPage.css';

const { Title } = Typography;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const navigate = useNavigate(); 

  const handleLogin = async (values) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;

      // Check if the user is an owner
      const ownerDocRef = doc(db, "owner-users", user.uid);
      const ownerDocSnap = await getDoc(ownerDocRef);
      if (ownerDocSnap.exists()) {
        const ownerData = ownerDocSnap.data();
        navigate("/mainpage", { state: { organizationID: ownerData.organizationID, role: 'owner' } });
      } else {
        // User is not an owner, check if they are a member
        let isMember = false;
        const organizationsRef = collection(db, "organizations");
        const orgsSnapshot = await getDocs(organizationsRef);
        for (const orgDoc of orgsSnapshot.docs) {
          const orgID = orgDoc.id;
          const memberDocRef = doc(db, `organizations/${orgID}/members`, user.uid);
          const memberDocSnap = await getDoc(memberDocRef);
          
          if (memberDocSnap.exists()) {
            const memberData = memberDocSnap.data();
            if (memberData.role === 'member') {
              navigate("/mainpage", { state: { organizationID: memberData.organizationID, role: 'member' } });
              isMember = true;
              break;
            }
          }
        }

        if (!isMember) {
          console.error("No such user in owner-users or members");
          message.error("No such user found.");
        }
      }
    } catch (error) {
      console.error("Login error:", error);
      message.error("Login failed.");
    }
  };

  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <div className="main-container">
      <div className="left-container">
        <div className="login-container">
          {!showOptions ? (
            <>
              <Title className="login-text" level={2}>Войти</Title>
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
                  rules={[{ required: true, message: 'Пожалуйста, введите ваш email!' }]}
                >
                  <Input 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email" 
                  />
                </Form.Item>

                <Form.Item
                  label="Пароль"
                  name="password"
                  rules={[{ required: true, message: 'Пожалуйста, введите ваш пароль!' }]}
                >
                  <Input.Password 
                    type='password'
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="пароль" 
                  />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" className="login-button">
                    Логин
                  </Button>
                </Form.Item>
              </Form>
              <div className="button-text">
                <Button type="link" onClick={() => setShowOptions(true)} className="registration-button">
                  Регистрация
                </Button>
              </div>
            </>
          ) : (
            <div className="signup-options">
              <Row gutter={16}>
                <Col span={12}>
                  <Card onClick={() => navigate('/register')} className="signup-card">
                    <Title level={4}>Создать организацию</Title>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card onClick={() => navigate('/register-member')} className="signup-card">
                    <Title level={4}>Присоединиться к организации</Title>
                  </Card>
                </Col>
              </Row>
            </div>
          )}
        </div>
      </div>
      <div className="right-container" />
    </div>
  );
};

export default LoginPage;

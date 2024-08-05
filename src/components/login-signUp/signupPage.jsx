import React from 'react';
import { Typography, Card, Row, Col, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined } from '@ant-design/icons';
import './signupPage.css';

const { Title, Text } = Typography;

const SignupPage = () => {
  const navigate = useNavigate();

  return (
    <div className="signup-main-container">
      <div className="signup-content-container">
        <Button 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/')} 
          className="back-button"
        >
          Назад
        </Button>
        <div className="signup-options">
          <Row gutter={16}>
            <Col span={12}>
              <Card 
                onClick={() => navigate('/register')}
                className="signup-card"
                hoverable
                style={{ borderColor: '#1890ff' }}
                cover={<div style={{ backgroundColor: '#e6f7ff', borderRadius: '8px' }} />}
              >
                <Title level={4} style={{ color: '#1890ff' }}>Создать организацию</Title>
                <Text>Создайте новую организацию и начните управлять своим бизнесом прямо сейчас.</Text>
              </Card>
            </Col>
            <Col span={12}>
              <Card 
                onClick={() => navigate('/register-member')}
                className="signup-card"
                hoverable
                style={{ borderColor: '#1890ff' }}
                cover={<div style={{ backgroundColor: '#e6f7ff', padding: '20px', borderRadius: '8px' }} />}
              >
                <Title level={4} style={{ color: '#1890ff' }}>Присоединиться к организации</Title>
                <Text>Присоединитесь к существующей организации и начните совместную работу.</Text>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;

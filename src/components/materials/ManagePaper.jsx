import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Input, message } from 'antd';
import PaperRoll from './PaperRoll';
import { db } from '../login-signUp/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';  // To get organizationID from MainPage

const ManagePaper = () => {
    const [isPaperRollModalVisible, setIsPaperRollModalVisible] = useState(false);
    const [isAgencyModalVisible, setIsAgencyModalVisible] = useState(false); // Modal for agency registration
    const [paperRolls, setPaperRolls] = useState([]);
    const [form] = Form.useForm();
    const [agencyForm] = Form.useForm(); // Form for agency registration
    const [selectedRollId, setSelectedRollId] = useState(null);

    // Get organizationID from the outlet context
    const { organizationID } = useOutletContext();

    // Fetch paper rolls from Firestore
    useEffect(() => {
        fetchPaperRolls();
    }, [organizationID]);

    const fetchPaperRolls = async () => {
        const paperRollRef = collection(db, `organizations/${organizationID}/paper-control`);
        const snapshot = await getDocs(paperRollRef);
        const rolls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPaperRolls(rolls);
    };

    const registerPaperRoll = async (values) => {
        const paperControlRef = collection(db, `organizations/${organizationID}/paper-control`);
        await addDoc(paperControlRef, {
            ...values,
            dateRegistered: new Date(),
            used: 0,
            remaining: values.kg,
            paperCards: []  // Initialize an empty array for paper cards
        });
        setIsPaperRollModalVisible(false);
        form.resetFields();
        fetchPaperRolls();  // Refresh the list of paper rolls
    };

    // Function to register a new agency
    const registerAgency = async (values) => {
        try {
            const agencyRef = collection(db, `organizations/${organizationID}/agencies`);
            await addDoc(agencyRef, {
                name: values.name
            });
            message.success('Агентство успешно зарегистрировано!');
            setIsAgencyModalVisible(false);
            agencyForm.resetFields();
        } catch (error) {
            message.error('Ошибка при регистрации агентства: ' + error.message);
        }
    };

    return (
        <div className="manage-paper-container">
            <Button type="primary" onClick={() => setIsPaperRollModalVisible(true)}>
                Зарегистрировать новый рулон
            </Button>

            <Button type="dashed" onClick={() => setIsAgencyModalVisible(true)} style={{ marginLeft: '10px' }}>
                Зарегистрировать агентство
            </Button>

            {/* Modal for registering a new paper roll */}
            <Modal
                title="Регистрация нового рулона"
                visible={isPaperRollModalVisible}
                onCancel={() => setIsPaperRollModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} onFinish={registerPaperRoll}>
                    <Form.Item name="name" label="Название бумаги" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="kg" label="Количество (кг)" rules={[{ required: true }]}>
                        <Input type="number" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal for registering a new agency */}
            <Modal
                title="Регистрация нового агентства"
                visible={isAgencyModalVisible}
                onCancel={() => setIsAgencyModalVisible(false)}
                onOk={() => agencyForm.submit()}
            >
                <Form form={agencyForm} onFinish={registerAgency}>
                    <Form.Item name="name" label="Название агентства" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Horizontal paper roll container */}
            <div className="paper-roll-list">
                {paperRolls.map(roll => (
                    <PaperRoll 
                        key={roll.id}
                        roll={roll}
                        isSelected={roll.id === selectedRollId}
                        onSelect={(id) => setSelectedRollId(id)}
                        organizationID={organizationID}
                    />
                ))}
            </div>
        </div>
    );
};

export default ManagePaper;

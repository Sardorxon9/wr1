import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Input, message } from 'antd';
import PaperRoll from './PaperRoll';
import { db } from '../login-signUp/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { useOutletContext } from 'react-router-dom';  // To get organizationID from MainPage

const ManagePaper = () => {
    const [isPaperRollModalVisible, setIsPaperRollModalVisible] = useState(false);
    const [paperRolls, setPaperRolls] = useState([]);
    const [selectedRollId, setSelectedRollId] = useState(null);  // Track the selected paper roll ID
    const [form] = Form.useForm();
    const { organizationID } = useOutletContext();

    // Fetch paper rolls from Firestore
    useEffect(() => {
        if (organizationID) {
            fetchPaperRolls();
        }
    }, [organizationID]);

    const fetchPaperRolls = async () => {
        try {
            const paperRollRef = collection(db, `organizations/${organizationID}/paper-control`);
            const snapshot = await getDocs(paperRollRef);
            const rolls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPaperRolls(rolls);
            setSelectedRollId(rolls[0]?.id || null);  // Automatically select the first paper roll
        } catch (error) {
            message.error('Ошибка при загрузке бумажных рулонов: ' + error.message);
        }
    };

    const registerPaperRoll = async (values) => {
        try {
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
        } catch (error) {
            message.error('Ошибка при регистрации рулона бумаги: ' + error.message);
        }
    };

    const handleRollSelect = (rollId) => {
        setSelectedRollId(rollId);  // Set the selected roll when clicked
    };

    return (
        <div className="manage-paper-container">
            <Button type="primary" onClick={() => setIsPaperRollModalVisible(true)}>Зарегистрировать новый рулон</Button>
            <Modal
                title="Зарегистрировать новый рулон"
                visible={isPaperRollModalVisible}
                onCancel={() => setIsPaperRollModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} onFinish={registerPaperRoll}>
                    <Form.Item name="name" label="Название бумаги" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <Form.Item name="kg" label="Общий вес (кг)" rules={[{ required: true }]}>
                        <Input type="number" />
                    </Form.Item>
                </Form>
            </Modal>

            <div className="paper-roll-list">
                {paperRolls.map(roll => (
                    <PaperRoll
                        key={roll.id}
                        roll={roll}
                        organizationID={organizationID}
                        isSelected={selectedRollId === roll.id}
                        onSelect={handleRollSelect}  // Pass the roll selection handler
                    />
                ))}
            </div>
        </div>
    );
};

export default ManagePaper;

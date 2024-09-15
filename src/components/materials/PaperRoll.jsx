import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Input, Select, message, Card, Progress } from 'antd';
import { doc, updateDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../login-signUp/firebase';
import PaperCard from './PaperCard';
import './PaperRoll.css';

const { Option } = Select;

const PaperRoll = ({ roll, isSelected, onSelect, organizationID }) => {
    const [isSendPaperModalVisible, setIsSendPaperModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [agencies, setAgencies] = useState([]);  // Store agencies for the modal

    // Fetch agencies from Firestore
    useEffect(() => {
        const fetchAgencies = async () => {
            try {
                const agencySnapshot = await getDocs(collection(db, `organizations/${organizationID}/agencies`));
                const agencyList = agencySnapshot.docs.map(doc => ({
                    id: doc.id,
                    name: doc.data().name
                }));
                setAgencies(agencyList);
                console.log(agencies);
            } catch (error) {
                message.error('Ошибка при получении списка агентств: ' + error.message);
            }
        };

        if (organizationID) {
            fetchAgencies();
        }
    }, [organizationID]);

    // Send paper to an agency and generate a new paper card
    const sendPaperToAgency = async (values) => {
        try {
            const newCard = {
                ...values,
                sentDate: new Date(),
                sentKg: values.kg,
                printedKg: 0,
                remainingKg: values.kg,
                receivedRecords: []  // Initialize with an empty array for received records
            };

            // Add the new paper card to Firestore within the selected roll
            const rollRef = doc(db, `organizations/${organizationID}/paper-control`, roll.id);
            await updateDoc(rollRef, {
                paperCards: [...roll.paperCards, newCard],
                used: roll.used + parseInt(values.kg),  // Update the used kg
                remaining: roll.remaining - parseInt(values.kg),  // Update the remaining kg
            });

            message.success('Бумага успешно отправлена в агентство!');
            setIsSendPaperModalVisible(false);
            form.resetFields();
        } catch (error) {
            message.error('Ошибка при отправке бумаги: ' + error.message);
        }
    };

    return (
        <div className="paper-roll">
            <Card
                className={`paper-roll-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelect(roll.id)}  // Select the roll when clicked
            >
                <p><strong>Бумага №{roll.name}</strong></p>
                <p>Без печати</p>
                <p>{roll.kg} кг</p>
                <Progress percent={(roll.used / roll.kg) * 100} showInfo={false} />
                <p>Использовано: {roll.used} кг</p>
                <p>Остаток: {roll.remaining} кг</p>
                <Button type="primary" onClick={(e) => { e.stopPropagation(); setIsSendPaperModalVisible(true); }}>Отправить в типографию</Button>
            </Card>

            {/* Modal for sending paper to agency */}
            <Modal
                title="Отправить бумагу в агентство"
                visible={isSendPaperModalVisible}
                onCancel={() => setIsSendPaperModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} onFinish={sendPaperToAgency}>
                    <Form.Item name="kg" label="Количество (кг)" rules={[{ required: true }]}>
                        <Input type="number" />
                    </Form.Item>
                    <Form.Item name="agency" label="Выберите агентство" rules={[{ required: true }]}>
                        <Select placeholder="Выберите агентство">
                            {agencies.map(agency => (
                                <Option key={agency.id} value={agency.name}>
                                    {agency.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Form.Item name="sentDate" label="Дата отправки" rules={[{ required: true }]}>
                        <Input type="date" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Only show paper cards if this roll is selected */}
            {isSelected && (
                <div className="paper-card-list">
                    {roll.paperCards && roll.paperCards.length > 0 ? (
                        roll.paperCards.map((card, index) => (
                            <PaperCard key={index} card={card} roll={roll} organizationID={organizationID} />
                        ))
                    ) : (
                        <p>Бумага ещё не отправлена в агентства.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default PaperRoll;

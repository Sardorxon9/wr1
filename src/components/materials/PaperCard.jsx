import React, { useState, useEffect } from 'react';
import { Button, Modal, Form, Input, Select, message, Card, Progress } from 'antd';
import { doc, updateDoc, getDocs, collection, getDoc } from 'firebase/firestore';
import { db } from '../login-signUp/firebase';
import { UserOutlined, CalendarOutlined, FileDoneOutlined } from '@ant-design/icons';

const { Option } = Select;

const PaperCard = ({ card, roll, organizationID }) => {
    const [isReceiveModalVisible, setIsReceiveModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [customers, setCustomers] = useState([]);

    // Fetch customers from Firestore
    useEffect(() => {
        const fetchCustomers = async () => {
            try {
                const customerSnapshot = await getDocs(collection(db, `organizations/${organizationID}/customers`));  // Correct reference to the collection
                const customerList = customerSnapshot.docs.map(doc => ({
                    id: doc.id,
                    brand: doc.data().brand
                }));
                setCustomers(customerList);
            } catch (error) {
                message.error('Error fetching customers: ' + error.message);
            }
        };

        if (organizationID) {
            fetchCustomers();
        }
    }, [organizationID]);

    // Register the paper received from the agency and update Firestore
    const registerReceivedPaper = async (values) => {
        try {
            const newRecord = {
                ...values,
                receiveDate: new Date(),
                receivedKg: values.kg
            };

            // Fetch the current paper roll document
            const rollRef = doc(db, `organizations/${organizationID}/paper-control`, roll.id);
            const rollDoc = await getDoc(rollRef);
            if (!rollDoc.exists()) {
                message.error('Paper roll not found.');
                return;
            }
            const rollData = rollDoc.data();

            // Find the correct paper card and update its receivedRecords manually
            const updatedPaperCards = rollData.paperCards.map(pCard => {
                if (pCard.agency === card.agency) {
                    const updatedRecords = [...pCard.receivedRecords, newRecord];
                    return {
                        ...pCard,
                        printedKg: parseInt(pCard.printedKg) + parseInt(values.kg),  // Fix leading zeros issue
                        remainingKg: pCard.remainingKg - values.kg,
                        receivedRecords: updatedRecords
                    };
                }
                return pCard;
            });

            // Update the Firestore document with the modified paperCards array
            await updateDoc(rollRef, { paperCards: updatedPaperCards });

            // Update customer's available paper
            const customerRef = doc(db, `organizations/${organizationID}/customers`, values.customerId);
            await updateDoc(customerRef, {
                'paper.available': values.kg  // Add received paper to customer's available amount
            });

            message.success('Received printed paper successfully!');
            setIsReceiveModalVisible(false);
            form.resetFields();
        } catch (error) {
            message.error('Error receiving printed paper: ' + error.message);
        }
    };

    return (
        <Card title={card.agency}>
            <p>Sent: {card.sentKg} kg | Printed: {parseInt(card.printedKg)} kg | Remaining: {card.remainingKg} kg</p>
            <Progress percent={(parseInt(card.printedKg) / parseInt(card.sentKg)) * 100} showInfo={false} />

            <Button type="primary" ghost onClick={() => setIsReceiveModalVisible(true)}>Register Paper Receive</Button>

            {/* Modal for registering received printed paper */}
            <Modal
                title="Register Received Printed Paper"
                visible={isReceiveModalVisible}
                onCancel={() => setIsReceiveModalVisible(false)}
                onOk={() => form.submit()}
            >
                <Form form={form} onFinish={registerReceivedPaper}>
                    <Form.Item name="kg" label="Received Amount (kg)" rules={[{ required: true }]}>
                        <Input type="number" />
                    </Form.Item>

                    <Form.Item name="customerId" label="Select Customer" rules={[{ required: true }]}>
                        <Select placeholder="Select a customer">
                            {customers.map(customer => (
                                <Option key={customer.id} value={customer.id}>
                                    {customer.brand}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item name="receiveDate" label="Date Received" rules={[{ required: true }]}>
                        <Input type="date" />
                    </Form.Item>
                </Form>
            </Modal>

            <h4>Received Records:</h4>
            {card.receivedRecords.length > 0 ? (
                card.receivedRecords.map((record, index) => {
                    const customer = customers.find(c => c.id === record.customerId);
                    return (
                        <p key={index} style={{ marginBottom: '10px' }}> {/* Added marginBottom for spacing between records */}
                            <span style={{ marginRight: '20px' }}>
                                <UserOutlined style={{ marginRight: '6px' }} />
                                {customer ? customer.brand : 'Unknown Customer'}
                            </span>
                            <span style={{ marginRight: '20px' }}>
                                <FileDoneOutlined style={{ marginRight: '6px' }} />
                                {record.receivedKg} kg
                            </span>
                            <span>
                                <CalendarOutlined style={{ marginRight: '6px' }} />
                                {new Date(record.receiveDate.seconds * 1000).toLocaleDateString()}
                            </span>
                        </p>
                    );
                    
                })
            ) : (
                <p>No records found.</p>
            )}
        </Card>
    );
};

export default PaperCard;

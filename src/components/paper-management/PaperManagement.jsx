import React, { useState, useEffect } from 'react';
import { Card, Button, Modal, InputNumber, Input, List, Select, message } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { db } from '../login-signUp/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

const { Option } = Select;

const PaperManagement = () => {
    const [papers, setPapers] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [newPaperWeight, setNewPaperWeight] = useState(0);
    const [newPaperId, setNewPaperId] = useState('');
    const [newAgencyName, setNewAgencyName] = useState('');
    const [selectedPaperId, setSelectedPaperId] = useState('');
    const [assignWeight, setAssignWeight] = useState(0);
    const [selectedAgencyId, setSelectedAgencyId] = useState('');
    const [modalType, setModalType] = useState('paper'); // 'paper' or 'agency'
    const [loading, setLoading] = useState(false);

    // Fetch papers from Firebase
    const fetchPapers = async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'paper-control'));
            const fetchedPapers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPapers(fetchedPapers);
        } catch (error) {
            message.error('Error fetching paper data');
        }
        setLoading(false);
    };

    // Fetch agencies from Firebase
    const fetchAgencies = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, 'agencies'));
            const fetchedAgencies = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAgencies(fetchedAgencies);
        } catch (error) {
            message.error('Error fetching agency data');
        }
    };

    // Open modal for creating new paper or agency
    const handleAddPaperOrAgency = (type) => {
        setModalType(type);
        setModalVisible(true);
    };

    // Confirm adding new paper and store it in Firebase
    const handleConfirmAddPaper = async () => {
        if (newPaperWeight > 0 && newPaperId) {
            try {
                const paperData = {
                    id: newPaperId,
                    totalWeight: newPaperWeight,
                    used: 0,
                    remaining: newPaperWeight,
                    sentToAgencies: [],
                };
                await addDoc(collection(db, 'paper-control'), paperData);
                message.success('New paper added successfully!');
                setModalVisible(false);
                fetchPapers(); // Refresh the list
            } catch (error) {
                message.error('Error adding new paper');
            }
        } else {
            message.error('Please provide valid paper details');
        }
    };

    // Confirm adding new agency and store it in Firebase
    const handleConfirmAddAgency = async () => {
        if (newAgencyName) {
            try {
                const agencyData = {
                    name: newAgencyName,
                    paperAssigned: [],
                };
                await addDoc(collection(db, 'agencies'), agencyData);
                message.success('New agency added successfully!');
                setModalVisible(false);
                fetchAgencies(); // Refresh the list
            } catch (error) {
                message.error('Error adding new agency');
            }
        } else {
            message.error('Please provide a valid agency name');
        }
    };

    // Confirm assigning paper to an agency
    const handleAssignPaperToAgency = async () => {
        if (selectedPaperId && selectedAgencyId && assignWeight > 0) {
            try {
                const selectedPaper = papers.find(paper => paper.id === selectedPaperId);
                if (assignWeight > selectedPaper.remaining) {
                    message.error('Not enough paper available');
                    return;
                }
                // Update paper data in Firebase
                const updatedSentToAgencies = [...selectedPaper.sentToAgencies, {
                    agencyId: selectedAgencyId,
                    assignedWeight: assignWeight,
                    date: new Date().toLocaleDateString('ru-RU', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                    }),
                }];
                await addDoc(collection(db, 'paper-control'), {
                    ...selectedPaper,
                    remaining: selectedPaper.remaining - assignWeight,
                    sentToAgencies: updatedSentToAgencies,
                });
                message.success('Paper assigned to agency successfully!');
                fetchPapers(); // Refresh the list
            } catch (error) {
                message.error('Error assigning paper to agency');
            }
        } else {
            message.error('Please provide valid assignment details');
        }
    };

    // Fetch the paper and agency lists on component mount
    useEffect(() => {
        fetchPapers();
        fetchAgencies();
    }, []);

    return (
        <div style={{ padding: '20px' }}>
            <h2>Paper Management</h2>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddPaperOrAgency('paper')} style={{ marginBottom: '20px' }}>
                Add New Unprinted Paper
            </Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddPaperOrAgency('agency')} style={{ marginBottom: '20px' }}>
                Add New Agency
            </Button>

            {/* Assign Paper to Agency Section */}
            <div style={{ marginBottom: '20px' }}>
                <h3>Assign Paper to Printing Agency</h3>
                <Select
                    placeholder="Select Paper"
                    style={{ width: '100%', marginBottom: '10px' }}
                    onChange={value => setSelectedPaperId(value)}
                >
                    {papers.map(paper => (
                        <Option key={paper.id} value={paper.id}>{`Paper №${paper.id} - ${paper.remaining} kg remaining`}</Option>
                    ))}
                </Select>
                <Select
                    placeholder="Select Agency"
                    style={{ width: '100%', marginBottom: '10px' }}
                    onChange={value => setSelectedAgencyId(value)}
                >
                    {agencies.map(agency => (
                        <Option key={agency.id} value={agency.id}>{agency.name}</Option>
                    ))}
                </Select>
                <InputNumber
                    placeholder="Assign Weight (kg)"
                    value={assignWeight}
                    onChange={value => setAssignWeight(value)}
                    style={{ width: '100%' }}
                />
                <Button type="primary" onClick={handleAssignPaperToAgency} style={{ marginTop: '10px' }}>
                    Assign Paper
                </Button>
            </div>

            <List
                loading={loading}
                grid={{ gutter: 16, column: 2 }}
                dataSource={papers}
                renderItem={paper => (
                    <List.Item>
                        <Card title={`Paper №${paper.id}`}>
                            <p>Total Weight: {paper.totalWeight} kg</p>
                            <p>Used: {paper.used} kg</p>
                            <p>Remaining: {paper.remaining} kg</p>
                        </Card>
                    </List.Item>
                )}
            />

            {/* Modal for adding paper or agency */}
            <Modal
                title={modalType === 'paper' ? 'Add New Unprinted Paper' : 'Add New Agency'}
                visible={modalVisible}
                onOk={modalType === 'paper' ? handleConfirmAddPaper : handleConfirmAddAgency}
                onCancel={() => setModalVisible(false)}
            >
                {modalType === 'paper' ? (
                    <>
                        <Input
                            placeholder="Paper ID"
                            value={newPaperId}
                            onChange={e => setNewPaperId(e.target.value)}
                            style={{ marginBottom: '10px' }}
                        />
                        <InputNumber
                            placeholder="Total Weight (kg)"
                            value={newPaperWeight}
                            onChange={value => setNewPaperWeight(value)}
                            style={{ width: '100%' }}
                        />
                    </>
                ) : (
                    <Input
                        placeholder="Agency Name"
                        value={newAgencyName}
                        onChange={e => setNewAgencyName(e.target.value)}
                    />
                )}
            </Modal>
        </div>
    );
};

export default PaperManagement;

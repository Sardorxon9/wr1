import React, { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Card,
  Progress,
  InputNumber,
  DatePicker,
} from 'antd';
import { doc, updateDoc, getDocs, collection, deleteDoc } from 'firebase/firestore';
import { db } from '../login-signUp/firebase';
import PaperCard from './PaperCard';
import './PaperRoll.css';
import { v4 as uuidv4 } from 'uuid';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'; // Import icons

const { Option } = Select;

const PaperRoll = ({
  roll,
  isSelected,
  onSelect,
  organizationID,
  refreshPaperRolls,
}) => {
  const [isSendPaperModalVisible, setIsSendPaperModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false); // New state for edit modal
  const [form] = Form.useForm();
  const [editForm] = Form.useForm(); // Form for editing
  const [agencies, setAgencies] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const agencySnapshot = await getDocs(
          collection(db, `organizations/${organizationID}/agencies`)
        );
        const agencyList = agencySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        }));
        setAgencies(agencyList);
      } catch (error) {
        message.error('Ошибка при получении списка агентств: ' + error.message);
      }
    };

    if (organizationID) {
      fetchAgencies();
    }
  }, [organizationID]);

  const sendPaperToAgency = async (values) => {
    setModalLoading(true);
    try {
      const newCard = {
        id: uuidv4(),
        ...values,
        sentDate: values.sentDate.toDate(),
        kg: parseFloat(values.kg),
        sentKg: parseFloat(values.kg),
        printedKg: 0,
        remainingKg: parseFloat(values.kg),
        receivedRecords: [],
      };

      const rollRef = doc(
        db,
        `organizations/${organizationID}/paper-control`,
        roll.id
      );
      await updateDoc(rollRef, {
        paperCards: [...roll.paperCards, newCard],
        used: roll.used + parseFloat(values.kg),
        remaining: roll.remaining - parseFloat(values.kg),
      });

      message.success('Бумага успешно отправлена в агентство!');
      setIsSendPaperModalVisible(false);
      form.resetFields();
      refreshPaperRolls();
    } catch (error) {
      message.error('Ошибка при отправке бумаги: ' + error.message);
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    Modal.confirm({
      title: 'Вы уверены, что хотите удалить этот рулон бумаги?',
      content: 'Это действие также удалит все связанные записи.',
      okText: 'Да',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk() {
        deletePaperRoll();
      },
    });
  };

  const deletePaperRoll = async () => {
    try {
      await deleteDoc(
        doc(db, `organizations/${organizationID}/paper-control`, roll.id)
      );
      message.success('Рулон бумаги успешно удалён.');
      refreshPaperRolls();
    } catch (error) {
      message.error('Ошибка при удалении рулона: ' + error.message);
    }
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setIsEditModalVisible(true);
    editForm.setFieldsValue({
      name: roll.name,
      kg: roll.kg,
    });
  };

  const editPaperRoll = async (values) => {
    setModalLoading(true);
    try {
      const rollRef = doc(
        db,
        `organizations/${organizationID}/paper-control`,
        roll.id
      );

      const newKg = values.kg;
      const kgDifference = newKg - roll.kg;
      const newRemaining = roll.remaining + kgDifference;

      await updateDoc(rollRef, {
        name: values.name,
        kg: newKg,
        remaining: newRemaining,
      });

      message.success('Рулон бумаги успешно обновлён.');
      setIsEditModalVisible(false);
      refreshPaperRolls();
    } catch (error) {
      message.error('Ошибка при обновлении рулона: ' + error.message);
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <div className="paper-roll">
      <Card
        className={`paper-roll-card ${isSelected ? 'selected' : ''}`}
        onClick={() => onSelect(roll.id)}
        extra={
          <>
            <EditOutlined
              onClick={handleEdit}
              style={{ marginRight: 16 }}
            />
          <DeleteOutlined
  onClick={handleDelete}
  style={{ color: '#cf1322' }} // Set icon color to red
/>
          </>
        }
      >
        <div className="paper-roll-card-content">
          <p>
            <strong>Бумага : {roll.name}</strong>
          </p>
          <p style={{ color: 'lightgray' }}>Рулон бумаги без печати</p>
          <p>{roll.kg} кг</p>
          <Progress percent={(roll.used / roll.kg) * 100} showInfo={false} />
          <p>Использовано: {roll.used} кг</p>
          <p>Остаток: {roll.remaining} кг</p>
          <Button
            type="primary"
            style={{ backgroundColor: '#1f1f1f', borderColor: '#1f1f1f' }}
            onClick={(e) => {
              e.stopPropagation();
              setIsSendPaperModalVisible(true);
            }}
          >
            Отправить в типографию
          </Button>
        </div>
      </Card>

      {/* Modal for editing paper roll */}
      <Modal
        title="Редактировать рулон бумаги"
        visible={isEditModalVisible}
        onCancel={() => setIsEditModalVisible(false)}
        onOk={() => editForm.submit()}
        confirmLoading={modalLoading}
      >
        <Form form={editForm} onFinish={editPaperRoll}>
          <Form.Item
            name="name"
            label="Название бумаги"
            rules={[{ required: true, message: 'Пожалуйста, введите название бумаги!' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="kg"
            label="Количество (кг)"
            rules={[
              { required: true, message: 'Пожалуйста, введите количество (кг)!' },
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal for sending paper to agency */}
      <Modal
        title="Отправить бумагу в агентство"
        visible={isSendPaperModalVisible}
        onCancel={() => setIsSendPaperModalVisible(false)}
        onOk={() => form.submit()}
        confirmLoading={modalLoading}
      >
        <Form form={form} onFinish={sendPaperToAgency}>
          <Form.Item
            name="kg"
            label="Количество (кг)"
            rules={[
              {
                required: true,
                message: 'Пожалуйста, введите количество (кг)!',
              },
            ]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="agency"
            label="Выберите агентство"
            rules={[{ required: true }]}
          >
            <Select placeholder="Выберите агентство">
              {agencies.map((agency) => (
                <Option key={agency.id} value={agency.name}>
                  {agency.name}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="sentDate"
            label="Дата отправки"
            rules={[{ required: true }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Only show paper cards if this roll is selected */}
      {isSelected && (
        <div className="paper-card-list">
          {roll.paperCards && roll.paperCards.length > 0 ? (
            roll.paperCards.map((card) => (
              <PaperCard
                key={card.id}
                card={card}
                roll={roll}
                organizationID={organizationID}
                refreshPaperRolls={refreshPaperRolls}
              />
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

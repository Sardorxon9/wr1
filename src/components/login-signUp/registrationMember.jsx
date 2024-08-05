import React, { useState } from 'react';
import { Form, Input, Button, Typography, Card, message } from 'antd';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc,setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore'; // Ensure all necessary imports
import { runTransaction, doc, getDoc, setDoc, updateDoc } from "firebase/firestore"; // Ensure correct imports

const { Title } = Typography;

const RegistrationMember = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [organizationInfo, setOrganizationInfo] = useState(null);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async () => {
    setLoading(true);
    try {
      // Query for the invited user by email
      const invitedUsersRef = collection(db, "invited-users");
      const q = query(invitedUsersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        message.error('No invitation found for this email.');
      } else {
        const invitedUserDoc = querySnapshot.docs[0];
        const invitedUserData = invitedUserDoc.data();

        // Get organization details
        const orgDocRef = doc(db, "organizations", invitedUserData.organizationID);
        const orgDocSnap = await getDoc(orgDocRef);

        if (orgDocSnap.exists()) {
          setOrganizationInfo({
            organizationName: orgDocSnap.data().name,
            ownerName: orgDocSnap.data().ownerName,
            organizationID: invitedUserData.organizationID,
            invitedUserDocId: invitedUserDoc.id,
          });
          setStep(2);
        } else {
          message.error('Organization not found.');
        }
      }
    } catch (error) {
      console.error("Error checking invitation:", error);
      message.error('Error occurred while checking the invitation.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      const { firstName, lastName, password } = values;
  
      // Create the user with email and password
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const user = result.user;
  
      // Reference to the existing 'pending' member document using the invitedUserDocId
      const existingMemberRef = doc(db, `organizations/${organizationInfo.organizationID}/members`, organizationInfo.invitedUserDocId);
  
      // Set the new document with the user's UID in the members collection
      const newMemberRef = doc(db, `organizations/${organizationInfo.organizationID}/members`, user.uid);
  
      // Use a transaction to update the member document with the new UID and remove the old one
      await runTransaction(db, async (transaction) => {
        // Fetch the existing member document
        const existingMemberDoc = await transaction.get(existingMemberRef);
        if (!existingMemberDoc.exists()) {
          throw "Document does not exist!";
        }
  
        // Copy existing member data, add new data, and write it to a new document with the correct UID
        const memberData = existingMemberDoc.data();
        transaction.set(newMemberRef, {
          ...memberData,
          email,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`,
          status: 'active',
        });
  
        // Remove the old member document with the invitedUserDocId
        transaction.delete(existingMemberRef);
      });
  
      // Update the invited-users collection to reflect the new status
      await updateDoc(doc(db, "invited-users", organizationInfo.invitedUserDocId), {
        status: 'active',
      });
  
      message.success('Registration successful!');
    } catch (error) {
      console.error("Registration error:", error);
      message.error('Error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="registration-member-container">
      <div className="form-container">
        <Title level={2}>Join Organization</Title>
        {step === 1 && (
          <Form layout="vertical" onFinish={handleEmailSubmit}>
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, message: 'Please enter your email!' }]}
            >
              <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Check Invitation
              </Button>
            </Form.Item>
          </Form>
        )}
        {step === 2 && organizationInfo && (
          <Card>
            <Title level={4}>{organizationInfo.organizationName}</Title>
            <p>Owner: {organizationInfo.ownerName}</p>
            <Button type="primary" onClick={() => setStep(3)}>Confirm and proceed with signup</Button>
          </Card>
        )}
        {step === 3 && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleRegister}
          >
            <Form.Item name="firstName" label="First Name" rules={[{ required: true, message: 'Please enter your first name!' }]}>
              <Input placeholder="Your first name" />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true, message: 'Please enter your last name!' }]}>
              <Input placeholder="Your last name" />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Please enter your password!' }]}>
              <Input.Password placeholder="Password" />
            </Form.Item>
            <Form.Item name="confirmPassword" label="Confirm Password" dependencies={['password']} rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('The two passwords do not match!'));
                },
              }),
            ]}>
              <Input.Password placeholder="Confirm password" />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Complete Registration
              </Button>
            </Form.Item>
          </Form>
        )}
      </div>
    </div>
  );
};

export default RegistrationMember;

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { addDoc, collection, getFirestore, serverTimestamp } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAywQYhYBWSeLfq_o6ZnLHdwKzm5ASqHsA",
  authDomain: "white-ray-app.firebaseapp.com",
  projectId: "white-ray-app",
  storageBucket: "white-ray-app.appspot.com",
  messagingSenderId: "652618803696",
  appId: "1:652618803696:web:31bce11e718f1b37c4d535",
  measurementId: "G-3ZXTR153Q5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export const auth = getAuth();
export const db = getFirestore(app);

// Function to create a new organization document
export const createOrganization = async (ownerId, organizationData) => {
  try {
    const organizationRef = collection(db, "organizations");
    const newOrganization = await addDoc(organizationRef, {
      ...organizationData,
      ownerId,
      createdAt: serverTimestamp(), // Add timestamp for creation
    });
    console.log("Organization created with ID:", newOrganization.id);
    return newOrganization.id; // Return the generated organization ID
  } catch (error) {
    console.error("Error creating organization:", error);
  }
};

export default app;

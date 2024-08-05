// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, addDoc, doc, setDoc } from "firebase/firestore";

// Your web app's Firebase configuration
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
export const auth = getAuth(app);
export const db = getFirestore(app);

// Function to create a new organization
export const createOrganization = async (ownerId, organizationData) => {
  try {
    // Create a new document in the "organizations" collection
    const orgRef = await addDoc(collection(db, "organizations"), {
      ...organizationData,
      ownerId,
      createdAt: new Date(), // Optionally, use serverTimestamp()
    });

    // Add the generated ID as a field in the document
    await setDoc(doc(db, "organizations", orgRef.id), {
      ...organizationData,
      ownerId,
      createdAt: new Date(),
      organizationID: orgRef.id, // Store the generated ID
    });

    console.log("Organization created with ID:", orgRef.id);
    return orgRef.id; // Return the generated organization ID
  } catch (error) {
    console.error("Error creating organization:", error);
  }
};

// Function to invite a user
export const inviteUser = async (email, organizationID) => {
  try {
    // Add to invited-users collection
    await addDoc(collection(db, "invited-users"), {
      email,
      organizationID,
      status: "pending",
    });

    // Add to organization's members with status "pending"
    const organizationRef = doc(db, "organizations", organizationID);
    await addDoc(collection(organizationRef, "members"), {
      email,
      status: "pending",
      organizationID // Ensure organizationID is stored here as well
    });

    console.log("User invited and added to pending members.");
  } catch (error) {
    console.error("Error inviting user:", error);
  }
};

export default app;

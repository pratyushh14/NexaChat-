
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


import {getStorage} from "firebase/storage";
import App from "../App";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "reactchat-c10fd.firebaseapp.com",
  projectId: "reactchat-c10fd",
  storageBucket: "reactchat-c10fd.firebasestorage.app",
  messagingSenderId: "112095254364",
  appId: "1:112095254364:web:745956eb2fa42a9cee1399"
};


const app = initializeApp(firebaseConfig);
export const auth=getAuth()
export const db=getFirestore()
export const storage=getStorage()


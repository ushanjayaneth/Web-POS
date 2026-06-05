import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD5jcs3rn2ImLYwnuM3TQc3u8esg0lU1iY",
  authDomain: "shop-lk-55dd1.firebaseapp.com",
  databaseURL: "https://shop-lk-55dd1-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "shop-lk-55dd1",
  storageBucket: "shop-lk-55dd1.firebasestorage.app",
  messagingSenderId: "743298199962",
  appId: "1:743298199962:web:aad7a600ed8de723c4ca23"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);

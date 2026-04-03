import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyB4796WIwK3Z8EQCs8miYqBhAqQQy4Ic_w",
  authDomain: "afridice-64cd2.firebaseapp.com",
  projectId: "afridice-64cd2",
  storageBucket: "afridice-64cd2.firebasestorage.app",
  messagingSenderId: "562611501809",
  appId: "1:562611501809:web:38884248b4ae96beaec750",
  measurementId: "G-K87JVWND6P",
  databaseURL: "https://afridice-64cd2-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
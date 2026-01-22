import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAp0HLGIOj7yxRIyj5WrM8Yq_ZLBV09h40",
  authDomain: "webweavers-29a14.firebaseapp.com",
  projectId: "webweavers-29a14",
  storageBucket: "webweavers-29a14.firebasestorage.app",
  messagingSenderId: "1073112014594",
  appId: "1:1073112014594:web:25bdd8256643541b442c1b",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

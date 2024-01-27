import { initializeApp } from "firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyDYUK4BEFg27JakJjEKL-HmYrXf6b5y_mM",
  authDomain: "video-chat-b9f3e.firebaseapp.com",
  databaseURL:
    "https://video-chat-b9f3e-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "video-chat-b9f3e",
  storageBucket: "video-chat-b9f3e.appspot.com",
  messagingSenderId: "1098321586481",
  appId: "1:1098321586481:web:832919f677dc02aab46810",
  measurementId: "G-Q8DG20R4MJ",
};

const firestore = initializeApp(firebaseConfig);

export default firestore;

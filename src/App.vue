<script setup lang="ts">
import { ref } from "vue";
import {
  getFirestore,
  collection,
  setDoc,
  addDoc,
  getDoc,
  updateDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import * as firebase from "firebase/app";

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

const app = firebase.initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

const pc = new RTCPeerConnection(servers);

const localStream = ref(null);
const remoteStream = ref(null);
const myVideo = ref(null);
const remoteVideos = ref(null);
const callInput = ref("");

const startWebCam = async () => {
  localStream.value = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  remoteStream.value = new MediaStream();

  // Push tracks from local stream to peer connection
  localStream.value.getTracks().forEach((track) => {
    pc.addTrack(track, localStream.value);
  });

  // Pull tracks from remote stream, add to video stream
  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.value.addTrack(track);
    });
  };

  myVideo.value.srcObject = localStream.value;
  remoteVideos.value.srcObject = remoteStream.value;
};

const createOffer = async () => {
  const callDoc = collection(
    firestore,
    `${Math.floor(Math.random() * (999999999999 - 1000000 + 1)) + 1000000}`
  );
  const offerCandidates = collection(firestore, "offerCandidates");
  const answerCandidates = collection(firestore, "answerCandidates");

  callInput.value = callDoc.id;

  // Get candidates for caller, save to db
  pc.onicecandidate = (event) => {
    event.candidate && addDoc(offerCandidates, event.candidate.toJSON());
  };

  // Create offer
  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };

  const callDocRef = doc(callDoc, callDoc.id);

  await setDoc(callDocRef, { offer });

  // Listen for remote answer
  onSnapshot(callDocRef, (snapshot) => {
    const data = snapshot.data();
    if (!pc.currentRemoteDescription && data?.answer) {
      const answerDescription = new RTCSessionDescription(data.answer);
      pc.setRemoteDescription(answerDescription);
    }
  });

  // When answered, add candidate to peer connection
  onSnapshot(answerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const candidate = new RTCIceCandidate(change.doc.data());
        pc.addIceCandidate(candidate);
      }
    });
  });
};

const answerCall = async () => {
  const callId = callInput.value;
  const callDoc = collection(firestore, callId);
  const offerCandidates = collection(firestore, "offerCandidates");
  const answerCandidates = collection(firestore, "answerCandidates");

  pc.onicecandidate = (event) => {
    event.candidate && addDoc(answerCandidates, event.candidate.toJSON());
  };

  const callDocRef = doc(callDoc, callId);

  const callData = (await getDoc(callDocRef)).data();

  const offerDescription = callData.offer;
  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await updateDoc(callDocRef, { answer });

  onSnapshot(offerCandidates, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      console.log(change);
      if (change.type === "added") {
        let data = change.doc.data();
        pc.addIceCandidate(new RTCIceCandidate(data));
      }
    });
  });
};
</script>

<template>
  <div class="flex justify-center gap-4 items-center">
    <video
      class="w-[30vw] min-h-[300px] m-2 bg-black"
      :ref="
        (ref) => {
          myVideo = ref;
        }
      "
      autoplay
      playsinline="true"
    ></video>
    <video
      class="w-[30vw] min-h-[300px] m-2 bg-black"
      :ref="
        (ref) => {
          remoteVideos = ref;
        }
      "
      autoplay
      playsinline="true"
    ></video>
  </div>
  <button id="webcamButton" @click="startWebCam">Start webcam</button>
  <h2>2. Create a new Call</h2>
  <button id="callButton" @click="createOffer">Create Call (offer)</button>

  <h2>3. Join a Call</h2>

  <input class="border-2 border-black" v-model="callInput" />
  <br />
  <button id="answerButton" @click="answerCall">Answer</button>
</template>

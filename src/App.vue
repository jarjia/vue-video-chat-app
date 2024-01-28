<script setup lang="ts">
// @ts-nocheck
import { onMounted, ref, watch } from "vue";
import {
  postCreateVideoSession,
  postCreateOffer,
  postCreateAnswerSession,
  postCreateAnswer,
  getVideoSession,
} from "./services/videoServices";
import useInstantiatePusher from "./helpers/useInstantiatePusher";

useInstantiatePusher();

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
  ],
  iceCandidatePoolSize: 10,
};

const pc = new RTCPeerConnection(servers);

const channel = ref(null);
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

  localStream.value.getTracks().forEach((track) => {
    pc.addTrack(track, localStream.value);
  });

  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.value.addTrack(track);
    });
  };

  myVideo.value.srcObject = localStream.value;
  remoteVideos.value.srcObject = remoteStream.value;
};

const createOffer = async () => {
  const random =
    Math.floor(Math.random() * (999999999999 - 1000000 + 1)) + 1000000;

  callInput.value = random;

  let candidates: {}[] = [];

  pc.onicecandidate = async (event) => {
    event.candidate && candidates.push(event.candidate.toJSON());
    if (event.candidate === null) {
      await postCreateVideoSession(random, candidates);
    }
  };

  const offerDescription = await pc.createOffer();
  await pc.setLocalDescription(offerDescription);

  const offer = {
    sdp: offerDescription.sdp,
    type: offerDescription.type,
  };
  await postCreateOffer(random, offer);
};

const answerCall = async () => {
  const callId = callInput.value;
  const { data } = await getVideoSession(callId);
  let candidates: {}[] = [];

  pc.onicecandidate = async (event) => {
    event.candidate && candidates.push(event.candidate.toJSON());
    if (event.candidate === null) {
      await postCreateAnswerSession(callId, candidates);
    }
  };

  const offerDescription = {
    ...data,
    sdp: data.sdp + "\n",
  };

  await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

  const answerDescription = await pc.createAnswer();
  await pc.setLocalDescription(answerDescription);

  const answer = {
    type: answerDescription.type,
    sdp: answerDescription.sdp,
  };

  await postCreateAnswer(callId, answer);
};

onMounted(() => {
  if (window.Echo) {
    channel.value = window.Echo.channel("video-chat");
  }
});

watch(channel, () => {
  channel.value.listen("VideoChatEvent", (data) => {
    const { message } = data;
    if (message?.answerCandidates) {
      message.answerCandidates.forEach((item) => {
        const candidate = new RTCIceCandidate(item);
        pc.addIceCandidate(candidate);
      });
    }
    if (message?.offerCandidates) {
      message.offerCandidates.forEach((item) => {
        pc.addIceCandidate(new RTCIceCandidate(item));
      });
    }
    if (!pc.currentRemoteDescription && message?.answer) {
      let ans = {
        ...message.answer,
        sdp: message.answer.sdp + "\n",
      };
      const answerDescription = new RTCSessionDescription(ans);
      pc.setRemoteDescription(answerDescription);
    }
  });
});
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
  <button @click="dumbFUnc">click</button>
</template>

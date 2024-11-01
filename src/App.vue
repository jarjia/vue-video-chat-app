<script setup lang="ts">
// @ts-nocheck
import { onBeforeMount, onMounted, ref, watch } from "vue";
import {
  postCreateVideoSession,
  postCreateOffer,
  postCreateAnswerSession,
  postCreateAnswer,
  getVideoSession,
} from "./services/videoServices";
import useInstantiatePusher from "./helpers/useInstantiatePusher";
import useServers from "./helpers/useServers";
import axios from "axios";
import Pusher from "pusher-js";

useInstantiatePusher();

let pc = null;

const servers = {
  iceServers: [
    {
      urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"],
    },
    {
      urls: "turn:turn.jarji-abuashvili.com:3478",
      username: "jarji",
      credential: "abuashvili",
    },
  ],
  iceCandidatePoolSize: 10,
};

pc = new RTCPeerConnection(servers);

const channel = ref(null);
const localStream = ref(null);
const remoteStream = ref(null);
const myVideo = ref(null);
const remoteVideos = ref(null);
const callInput = ref("");

onMounted(async () => {
  localStream.value = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  const audio = localStream.value.getAudioTracks()[0];

  remoteStream.value = new MediaStream();

  localStream.value.getTracks().forEach((track) => {
    pc.addTrack(track, localStream.value);
  });

  pc.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.value.addTrack(track);
    });
  };

  // audio.enabled = false;

  myVideo.value.srcObject = localStream.value;
  remoteVideos.value.srcObject = remoteStream.value;
});

// const startWebCam = async () => {};

const createOffer = async () => {
  const random = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;

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

if (window.Echo) {
  console.log("Echo connected successfully.");
}
if (window.Pusher) {
  console.log("Pusher loaded successfully.");
}

onMounted(() => {
  window.Pusher.logToConsole = true;

  channel.value = window.Echo.channel("video-chat");

  channel.value.listen("VideoChatEvent", (data) => {
    console.log("Received VideoChatEvent:", data);
  });

  channel.value.listen(".pusher:subscription_succeeded", () => {
    console.log("Successfully subscribed to the video-chat channel");
  });

  channel.value.listen("pusher_internal:subscription_succeeded", () => {
    console.log("Successfully subscribed to the video-chat channel");
  });
});

const answerCandidates = ref(null);
const offerCandidates = ref(null);
const answer = ref(null);

watch(channel, () => {
  if (channel.value) {
    channel.value.listen("VideoChatEvent", (data) => {
      const { message } = data;
      console.log(message);
      if (message?.answerCandidates) {
        message.answerCandidates.forEach((item) => {
          const candidate = new RTCIceCandidate(item);
          pc.addIceCandidate(candidate);
        });
        answerCandidates.value = message.answerCandidates;
      }
      if (message?.offerCandidates) {
        message.offerCandidates.forEach((item) => {
          pc.addIceCandidate(new RTCIceCandidate(item));
        });
        offerCandidates.value = message.offerCandidates;
      }
      if (!pc.currentRemoteDescription && message?.answer) {
        let ans = {
          ...message.answer,
          sdp: message.answer.sdp + "\n",
        };
        answer.value = message?.answer;
        const answerDescription = new RTCSessionDescription(ans);
        pc.setRemoteDescription(answerDescription);
      }
    });
  }
});
</script>

<template>
  <p class="my-4">
    Create a chat and send the code to a person you want to chat with or have
    the other person send you the code(which needs to be inputed in the code
    field) and click green answer button to accept the call. Below messages are
    purely for testing purposes.
  </p>
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
      oncontextmenu="return false;"
      muted
    ></video>
    <video
      class="w-[30vw] min-h-[300px] m-2 bg-black"
      :ref="
        (ref) => {
          remoteVideos = ref;
        }
      "
      oncontextmenu="return false;"
      autoplay
      playsinline="true"
    ></video>
  </div>
  <button
    id="callButton"
    @click="createOffer"
    class="bg-blue-400 text-white p-4 m-2"
  >
    Create chat
  </button>
  <br />

  code: <input class="border-2 border-black" v-model="callInput" />
  <br />
  <button
    id="answerButton"
    @click="answerCall"
    class="p-4 text-white mt-2 active:bg-green-700 bg-green-500"
  >
    Answer
  </button>
  <p class="bg-black p-1 text-green-500" v-if="offerCandidates !== null">
    offer candidates არის
  </p>
  <p class="bg-black p-1 text-green-500" v-if="answerCandidates !== null">
    answer candidates არის
  </p>
  <p class="bg-black p-1 text-green-500" v-if="answer !== null">პასუხი არის</p>
  <p>offer candidates</p>
  <pre>{{ offerCandidates }}</pre>
  <p>answer candidates</p>
  <pre>{{ answerCandidates }}</pre>
  <p>answer</p>
  <pre>{{ answer }}</pre>
</template>

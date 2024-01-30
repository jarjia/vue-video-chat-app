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

useInstantiatePusher();
let pc = null;

(async () => {
  try {
    const { data } = await axios.get(
      `${import.meta.env.VITE_TURN_SERVER_URL}?apiKey=${
        import.meta.env.VITE_TURN_SERVER_KEY
      }`
    );

    const servers = {
      iceServers: [
        {
          urls: [
            "stun:stun1.l.google.com:19302",
            "stun:stun2.l.google.com:19302",
          ],
        },
        // {
        //   urls: "turn:openrelay.metered.ca:80",
        //   username: "openrelayproject",
        //   credential: "openrelayproject",
        // },
      ],
      iceCandidatePoolSize: 10,
    };

    pc = new RTCPeerConnection(servers);

    localStream.value = await navigator.mediaDevices.getUserMedia({
      video: { echoCancellation: true },
      audio: { echoCancellation: true },
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
  } catch (error) {
    console.log(error);
  }
})();

const channel = ref(null);
const localStream = ref(null);
const remoteStream = ref(null);
const myVideo = ref(null);
const remoteVideos = ref(null);
const callInput = ref("");

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

onMounted(() => {
  if (window.Echo) {
    channel.value = window.Echo.channel("video-chat");
  }
});

const answerCandidates = ref(null);
const offerCandidates = ref(null);
const answer = ref(null);

watch(channel, () => {
  channel.value.listen("VideoChatEvent", (data) => {
    const { message } = data;
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
      muted
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
  <button
    id="callButton"
    @click="createOffer"
    class="bg-blue-400 text-white p-4 m-2"
  >
    ჩათის შექმნა
  </button>
  <br />

  კოდი: <input class="border-2 border-black" v-model="callInput" />
  <br />
  <button
    id="answerButton"
    @click="answerCall"
    class="p-4 text-white mt-2 active:bg-green-700 bg-green-500"
  >
    პასუხი
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

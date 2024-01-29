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
    pc = new RTCPeerConnection(data);
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
  <button
    id="webcamButton"
    @click="startWebCam"
    class="bg-blue-400 text-white p-4 m-2"
  >
    კამერის ჩართვა
  </button>
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
</template>

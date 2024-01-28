import axios from "./axios";
// @ts-nocheck

export const getVideoSession = (random: string) => {
  return axios.get("api/video/video-chat", {
    params: { random },
  });
};

export const postCreateAnswerSession = (random: string, candidates: {}[]) => {
  return axios.post("api/video/video-answer-session", {
    random,
    candidates,
  });
};

export const postCreateVideoSession = (random: string, candidates: {}[]) => {
  return axios.post("api/video/video-chat", {
    random,
    candidates,
  });
};

export const postCreateOffer = (random: string, offer: {}) => {
  return axios.post("api/video/video-offer", {
    offer,
    random,
  });
};

export const postCreateAnswer = (random: string, answer: {}) => {
  return axios.post("api/video/video-answer", {
    answer,
    random,
  });
};

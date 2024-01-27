import Echo from "laravel-echo";
import Pusher from "pusher-js";

declare global {
  interface Window {
    Pusher: typeof Pusher;
    Echo: Echo;
  }
}

function useInstantiatePusher() {
  window.Pusher = Pusher;

  window.Echo = new Echo({
    authEndpoint: `http://localhost:8000/broadcasting/auth`,
    broadcaster: "pusher",
    key: "02224b564dec8bfa9d8c",
    forceTLS: true,
    cluster: ["eu"],
  });

  return true;
}

export default useInstantiatePusher;

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
    authEndpoint: `${import.meta.env.VITE_API_URL}broadcasting/auth`,
    broadcaster: "pusher",
    key: import.meta.env.VITE_PUSHER_KEY,
    forceTLS: true,
    cluster: ["eu"],
    withCredentials: true
  });

  return true;
}

export default useInstantiatePusher;

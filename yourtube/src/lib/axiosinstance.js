import axios from "axios";

const axiosInstance = axios.create({
  // Keep production API calls off the Vercel origin if its environment
  // variables have not yet been configured.
  baseURL:
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://youtube-fz1h.onrender.com",
});

export default axiosInstance;

import { useState, useEffect, useContext, createContext, useCallback } from "react";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSignInDialogOpen, setIsSignInDialogOpen] = useState(false);

  const applyTheme = (userdata) => {
    if (!userdata) {
      document.documentElement.classList.add("dark");
      return;
    }
    const southStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];
    const isSouthIndia = southStates.includes(userdata.state);
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const istTime = new Date(utcTime + 330 * 60000);
    const hours = istTime.getHours();
    if (isSouthIndia && hours >= 10 && hours <= 12) {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  };

  const login = useCallback((userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
    setIsSignInDialogOpen(false);
    applyTheme(userdata);
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    document.documentElement.classList.add("dark");
  };

  /** Helper: detect location */
  const detectLocation = async () => {
    try {
      const geoResponse = await fetch("https://get.geojs.io/v1/ip/geo.json");
      const geoData = await geoResponse.json();
      return { state: geoData.region || "", city: geoData.city || "" };
    } catch {
      return { state: "", city: "" };
    }
  };

  /**
   * Called by @react-oauth/google after user picks a Google account.
   * Sends access_token to backend for server-side verification.
   */
  const onGoogleSuccess = useCallback(
    async (tokenResponse) => {
      setIsSigningIn(true);
      try {
        const { state, city } = await detectLocation();
        const response = await axiosInstance.post("/user/google-login", {
          access_token: tokenResponse.access_token,
          state,
          city,
        });
        if (response.data.result) {
          login(response.data.result);
        }
      } catch (error) {
        console.error("Google login error:", error);
      } finally {
        setIsSigningIn(false);
      }
    },
    [login]
  );

  /**
   * Called by the phone.email widget via global phoneEmailReceiver.
   * Sends user_json_url to backend which fetches the verified email.
   */
  const onPhoneEmailSuccess = useCallback(
    async (userJsonUrl) => {
      setIsSigningIn(true);
      try {
        const { state, city } = await detectLocation();
        const response = await axiosInstance.post("/user/email-otp-login", {
          user_json_url: userJsonUrl,
          state,
          city,
        });
        if (response.data.result) {
          login(response.data.result);
        }
      } catch (error) {
        console.error("Email OTP login error:", error);
      } finally {
        setIsSigningIn(false);
      }
    },
    [login]
  );

  // Restore session from localStorage on page load
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        setUser(parsed);
        applyTheme(parsed);
      } catch {
        localStorage.removeItem("user");
        applyTheme(null);
      }
    } else {
      applyTheme(null);
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        onGoogleSuccess,
        onPhoneEmailSuccess,
        isSigningIn,
        setIsSigningIn,
        isSignInDialogOpen,
        setIsSignInDialogOpen,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

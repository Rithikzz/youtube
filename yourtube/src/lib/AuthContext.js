import { useState, useEffect, useContext, createContext, useCallback } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import axiosInstance from "./axiosinstance";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Apply light/dark theme based on user region + IST time
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
    applyTheme(userdata);
  }, []);

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    document.documentElement.classList.add("dark");
  };

  /**
   * Called by @react-oauth/google with the access_token after user picks account.
   * We send the token to the backend which calls Google's userinfo endpoint to
   * verify it and then upserts the user in MongoDB.
   */
  const onGoogleSuccess = useCallback(
    async (tokenResponse) => {
      setIsSigningIn(true);
      try {
        // Detect location for region-based theming
        let state = "";
        let city = "";
        try {
          const geoResponse = await fetch("https://get.geojs.io/v1/ip/geo.json");
          const geoData = await geoResponse.json();
          state = geoData.region || "";
          city = geoData.city || "";
        } catch {
          console.warn("Location detection failed");
        }

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
    <UserContext.Provider value={{ user, login, logout, onGoogleSuccess, isSigningIn, setIsSigningIn }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

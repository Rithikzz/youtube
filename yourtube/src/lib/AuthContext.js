import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState } from "react";
import { createContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { useEffect, useContext } from "react";
import OtpDialogue from "@/components/OtpDialogue";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // OTP State
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [authUserId, setAuthUserId] = useState(null);
  const [authOtpMethod, setAuthOtpMethod] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [mockOtp, setMockOtp] = useState("");

  const applyTheme = (userdata) => {
    if (!userdata) {
      document.documentElement.classList.add("dark");
      return;
    }
    
    const southStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];
    const isSouthIndia = southStates.includes(userdata.state);
    
    // Calculate current IST time
    const now = new Date();
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istTime = new Date(utcTime + (330 * 60000)); // +5:30
    
    const hours = istTime.getHours();
    
    // 10 AM to 12 PM IST
    if (isSouthIndia && hours >= 10 && hours <= 12) {
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
    }
  };

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
    applyTheme(userdata);
  };
  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };
  const handlegooglesignin = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      
      // Location Detection
      let state = "";
      let city = "";
      try {
        const geoResponse = await fetch("https://get.geojs.io/v1/ip/geo.json");
        const geoData = await geoResponse.json();
        state = geoData.region || "";
        city = geoData.city || "";
      } catch (err) {
        console.warn("Failed to detect location");
      }

      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
        state,
        city
      };
      
      const response = await axiosInstance.post("/user/login", payload);
      
      if (response.data.userId) {
        // Trigger OTP Dialogue
        setAuthUserId(response.data.userId);
        setAuthOtpMethod(response.data.otpMethod);
        setAuthEmail(firebaseuser.email);
        setMockOtp(response.data.otp || "");
        setIsOtpOpen(true);
      }
    } catch (error) {
      console.error(error);
    }
  };
  useEffect(() => {
    const unsubcribe = onAuthStateChanged(auth, async (firebaseuser) => {
      if (firebaseuser) {
        try {
          const payload = {
            email: firebaseuser.email,
            name: firebaseuser.displayName,
            image: firebaseuser.photoURL || "https://github.com/shadcn.png",
          };
          // Don't auto-login if they aren't verified by OTP, 
          // but since Firebase persists session, we can skip OTP for returning sessions 
          // if we had a persistent backend session. For this context, if they refresh, 
          // we should just show them logged out so they do the OTP flow again, OR we bypass for ease.
          // Let's bypass OTP on refresh if they are already in local storage.
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
             const parsed = JSON.parse(storedUser);
             login(parsed);
          } else {
             logout();
          }
        } catch (error) {
          console.error(error);
          logout();
        }
      } else {
         applyTheme(null); // default to dark
      }
    });
    return () => unsubcribe();
  }, []);

  return (
    <UserContext.Provider value={{ user, login, logout, handlegooglesignin }}>
      {children}
      <OtpDialogue
        isopen={isOtpOpen}
        onclose={() => setIsOtpOpen(false)}
        userId={authUserId}
        otpMethod={authOtpMethod}
        email={authEmail}
        mockOtp={mockOtp}
        onLoginSuccess={(finalUser) => login(finalUser)}
      />
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

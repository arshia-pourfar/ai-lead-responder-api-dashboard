"use client";

import { useState, useEffect } from "react";

const AUTH_CHANGE_EVENT = "auth-change";

export function useAuth() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem("token");
      setIsLoggedIn(!!token);
      setLoading(false);
    };

    checkAuth();

    const onStorage = () => checkAuth();
    const onAuthChange = () => checkAuth();

    window.addEventListener("storage", onStorage);
    window.addEventListener(AUTH_CHANGE_EVENT, onAuthChange);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(AUTH_CHANGE_EVENT, onAuthChange);
    };
  }, []);

  return { isLoggedIn, loading };
}

export function notifyAuthChange() {
  window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
}

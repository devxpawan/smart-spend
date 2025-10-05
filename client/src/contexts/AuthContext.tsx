import axios, { AxiosError, AxiosRequestConfig } from "axios";
import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "./auth-exports";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt: string;
  isGoogleUser: boolean;
  preferences: {
    currency: string;
    reminderDaysBefore: number;
    theme: string;
  };
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  googleLogin: (credential: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: FormData, config?: AxiosRequestConfig) => Promise<void>;
  removeAvatar: () => Promise<void>;
  updateCurrency: (currency: string) => Promise<void>;
  deleteProfile: () => Promise<void>; // ADD THIS LINE
  loginWithToken: (token: string, user: User) => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (
    email: string,
    otp: string,
    password: string
  ) => Promise<void>;
  clearError: () => void;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Setup axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // Check for existing token and fetch user data
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await axios.get("/api/auth/me");
        setUser(res.data);
        setLoading(false);
      } catch {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post("/api/auth/login", { email, password });

      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      navigate("/");
      toast.success("Logged in successfully");
    } catch (err: unknown) {
      let errorMessage = "Login failed";
      if (err instanceof AxiosError) {
        if (err.response?.status === 400) {
          errorMessage =
            err.response?.data?.message || "Invalid email or password";
        } else if (err.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = err.response?.data?.message || "Login failed";
        }
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    name: string,
    email: string,
    password: string
  ): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      await axios.post("/api/auth/register", {
        name,
        email,
        password,
      });

      toast.success("OTP sent to your email. Please verify to continue.");
      setLoading(false);
      return true;
    } catch (err: unknown) {
      let errorMessage = "Registration failed";
      if (err instanceof AxiosError) {
        if (err.response?.status === 400) {
          errorMessage =
            err.response?.data?.message || "Invalid registration data";
        } else if (err.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = err.response?.data?.message || "Registration failed";
        }
      }
      setError(errorMessage);
      toast.error(errorMessage);
      setLoading(false);
      return false;
    }
  };

  const googleLogin = async (credential: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.post("/api/auth/google", {
        token: credential,
      });

      localStorage.setItem("token", res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      navigate("/");
      toast.success("Logged in successfully");
    } catch (err: unknown) {
      let errorMessage = "Google login failed";
      if (err instanceof AxiosError) {
        if (err.response?.status === 400) {
          errorMessage =
            err.response?.data?.message || "Google authentication failed";
        } else if (err.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage = err.response?.data?.message || "Google login failed";
        }
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    navigate("/auth");
    toast.success("Signed out successfully");
  };

  const updateProfile = async (data: FormData, config?: AxiosRequestConfig) => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.put("/api/auth/profile", data, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        ...config,
      });
      setUser(res.data.user);
      toast.success("Profile updated successfully");
    } catch (err: unknown) {
      console.error("Profile update error:", err);
      let errorMessage = "Failed to update profile";
      if (err instanceof AxiosError) {
        if (err.response?.status === 400) {
          errorMessage = err.response?.data?.message || "Invalid profile data";
        } else if (err.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage =
            err.response?.data?.message || "Failed to update profile";
        }
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const removeAvatar = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.delete("/api/auth/profile/avatar");
      setUser(res.data.user);
      toast.success("Profile image removed successfully");
    } catch (err: unknown) {
      console.error("Remove avatar error:", err);
      let errorMessage = "Failed to remove profile image";
      if (err instanceof AxiosError) {
        if (err.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage =
            err.response?.data?.message || "Failed to remove profile image";
        }
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrency = async (currency: string) => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.put("/api/auth/currency", { currency });
      if (user) {
        setUser({ ...user, preferences: res.data.user.preferences });
      }
      toast.success("Currency updated successfully");
    } catch (err: unknown) {
      console.error("Currency update error:", err);
      let errorMessage = "Failed to update currency";
      if (err instanceof AxiosError) {
        if (err.response?.status === 400) {
          errorMessage = err.response?.data?.message || "Invalid currency data";
        } else if (err.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage =
            err.response?.data?.message || "Failed to update currency";
        }
      }
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ADD THIS NEW DELETE PROFILE FUNCTION
  const deleteProfile = async () => {
    setLoading(true);
    setError(null);

    try {
      await axios.delete("/api/auth/profile");

      // Clear user state and token immediately
      localStorage.removeItem("token");
      setToken(null);
      setUser(null);

      // Navigate to auth page
      navigate("/auth");
    } catch (err: unknown) {
      console.error("Delete profile error:", err);
      let errorMessage = "Failed to delete profile";
      if (err instanceof AxiosError) {
        if (err.response?.status === 400) {
          errorMessage = err.response?.data?.message || "Invalid request";
        } else if (err.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else {
          errorMessage =
            err.response?.data?.message || "Failed to delete profile";
        }
      }
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw to handle in component
    } finally {
      setLoading(false);
    }
  };

  const loginWithToken = (token: string, user: User) => {
    localStorage.setItem("token", token);
    setToken(token);
    setUser(user);
    navigate("/");
    toast.success("Logged in successfully");
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    setError(null);
    try {
      await axios.post("/api/auth/forgot-password", { email });
      toast.success("Password reset OTP sent to your email.");
    } catch (err: unknown) {
      let errorMessage = "Failed to send OTP";
      if (err instanceof AxiosError && err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw to handle in component
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (
    email: string,
    otp: string,
    password: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      await axios.post("/api/auth/reset-password", { email, otp, password });
      toast.success("Password has been reset successfully.");
    } catch (err: unknown) {
      let errorMessage = "Failed to reset password";
      if (err instanceof AxiosError && err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      setError(errorMessage);
      toast.error(errorMessage);
      throw err; // Re-throw to handle in component
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        login,
        register,
        googleLogin,
        logout,
        updateProfile,
        removeAvatar,
        updateCurrency,
        deleteProfile,
        loginWithToken,
        forgotPassword,
        resetPassword,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

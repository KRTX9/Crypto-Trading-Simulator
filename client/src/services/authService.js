import apiClient from "./apiClient";

const authService = {
  // Core authentication methods
  register: async (userData) => {
    const response = await apiClient.post("/auth/register/", userData);
    return response.data;
  },

  login: async (email, password) => {
    const response = await apiClient.post("/auth/login/", {
      email,
      password,
    });

    if (response.data.access) {
      localStorage.setItem("token", response.data.access);
      localStorage.setItem("refreshToken", response.data.refresh);
      localStorage.setItem("user", JSON.stringify(response.data.user));
    }

    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
  },

  getCurrentUser: () => {
    try {
      const user = localStorage.getItem("user");
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem("token");
    const user = authService.getCurrentUser();
    return !!(token && user);
  },

  // Email verification methods
  verifyEmail: async (email, otp) => {
    try {
      const response = await apiClient.post("/auth/verify-email/", {
        email,
        otp,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  sendVerificationEmail: async (email) => {
    try {
      const response = await apiClient.post("/auth/send-verification/", {
        email,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Password reset methods
  resetPassword: async (email) => {
    try {
      const response = await apiClient.post("/auth/password-reset/request/", {
        email,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  verifyOTP: async (data) => {
    try {
      const response = await apiClient.post(
        "/auth/password-reset/verify/",
        data
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  changePassword: async (oldPassword, newPassword) => {
    try {
      const response = await apiClient.post("/auth/password/change/", {
        old_password: oldPassword,
        new_password: newPassword,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Google OAuth integration
  googleLogin: async (credentialToken) => {
    try {
      const response = await apiClient.post("/auth/google-login/", {
        access_token: credentialToken,
      });

      if (response.data.access) {
        localStorage.setItem("token", response.data.access);
        localStorage.setItem("refreshToken", response.data.refresh);
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Setup axios interceptors - now handled by shared apiClient
  setupAxiosInterceptors: () => {
    // Interceptors are now configured in apiClient.js
    // This function is kept for backward compatibility
  },
};

export default authService;

import axios from "axios"

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// interceptors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized (Token expired/Invalid)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt to refresh the tokens (cookies will be updated by the server)
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Retry the original request (cookies are now updated)
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // If refresh fails, the user needs to log in again
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;


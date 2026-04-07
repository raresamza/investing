import axiosInstance from "./axios-instance";

import { LoginDto, SignUpDto } from "@/types/types";

export async function signup(dto: SignUpDto) {
    const response = await axiosInstance.post("/auth/signup", dto);
    console.log(response.data);
    return response.data;
}

export async function login(dto: LoginDto) {
    console.log("Login API Call with DTO:", dto);
    try {
        const response = await axiosInstance.post("/auth/login", dto);
        console.log("Login API Success Response:", response.data);
        return response.data;
    } catch (error: any) {
        console.error("Login API Error Response:", error.response?.data);
        throw error;
    }
}

export async function verifyEmail(token: string) {
    const response = await axiosInstance.get("/auth/verify-email", {
        params: { token },
        withCredentials: true,
        headers: { "Content-Type": "application/json" }
    });
    console.log(response.data);
    return response.data;
}

export async function resendVerificationEmail(email: string) {
    const response = await axiosInstance.post("/auth/resend-verification", { email });
    console.log(response.data);
    return response.data;
}
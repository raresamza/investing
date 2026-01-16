import axiosInstance from "./axios-instance";

import { SignUpDto } from "@/types/types";

export async function signup(dto:SignUpDto) {
    console.log(dto);
    const response = await axiosInstance.post("/signp",dto);
    console.log(response.data);
    return response.data;
}
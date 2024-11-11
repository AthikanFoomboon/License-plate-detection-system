// src/functions/user.js
import axios from 'axios';

// ฟังก์ชันสำหรับสร้างผู้ใช้
export const addFromCamera_API = async (token, group) => {
    const url = `${process.env.REACT_APP_API}/addFromData`;
    const headers = { authToken: token };
    const data = { fromCamera: group };
    try {
        const response = await axios.post(url, data, { headers });
        return response.data;
    } catch (error) {
        console.error("Error creating person:", error);
        // โยน error กลับไปให้ catch ในที่เรียกใช้ addFromCamera_API()
        throw error.response ? error.response : new Error("Unknown error");
    }
};

export const streaming_API = async (token,group) => {
    const url = `${process.env.REACT_APP_API}/streaming`;
    const headers = { authToken: token }; // ตรวจสอบว่า 'null' เป็นสตริงที่ถูกต้องหรือไม่
    const data = group ;
    try {
        const response = await axios.post(url, data, { headers });
        return response.data;
    } catch (error) {
        console.error("Error creating person:", error);
        throw error.response ? error.response : new Error("Unknown error");
    }
};

export const listDeviceConnection_API = async(token,userId)=>{
    const url = `${process.env.REACT_APP_API}/listDeviceConnection`;
    const headers = { authToken: token }; // ตรวจสอบว่า 'null' เป็นสตริงที่ถูกต้องหรือไม่
   const data = {userId:userId}
    try {
        const response = await axios.post(url, data, { headers });
        return response.data;
    } catch (error) {
        console.error("Error creating person:", error);
        throw error.response ? error.response : new Error("Unknown error");
    }
}
export const editListDeviceConnection_AIP = async(token,data)=>{
    const url = `${process.env.REACT_APP_API}/edit-listDeviceConnection`;
    const headers = { authToken: token }; // ตรวจสอบว่า 'null' เป็นสตริงที่ถูกต้องหรือไม่
    const fromdata = {data:data}
    try {
        const response = await axios.post(url, fromdata, { headers });
        return response.data;
    } catch (error) {
        console.error("Error creating person:", error);
        throw error.response ? error.response : new Error("Unknown error");
    }
}
export const removeListDeviceConnection = async(token,data)=>{
    const url = `${process.env.REACT_APP_API}/remove-listDeviceConnection`;
    const headers = { authToken: token }; // ตรวจสอบว่า 'null' เป็นสตริงที่ถูกต้องหรือไม่
    const fromdata = {data:data}
    try {
        const response = await axios.post(url, fromdata, { headers });
        return response.data;
    } catch (error) {
        console.error("Error creating person:", error);
        throw error.response ? error.response : new Error("Unknown error");
    }
}

const prisma = require('../config/prisma');

const addFromData = async (req, res) => {
    const data = req.body;

    // Log ข้อมูลที่ได้รับจาก request
    try {
        // ตรวจสอบว่ามี IP ซ้ำอยู่ในฐานข้อมูลหรือไม่

        const existingCamera = await prisma.camera.findFirst({
            where: {
                ip: data.fromCamera.ip
            }
        });

        if (existingCamera) {
            // หากมี IP นี้อยู่แล้วในฐานข้อมูล ให้ส่ง response กลับไป
            return res.status(400).send('IP กล้อง มีในระบบอยู่เเล้ว');
        }

        // ถ้าไม่มี IP ซ้ำ ให้สร้างข้อมูลกล้องใหม่
        const result = await prisma.camera.create({
            data: {
                ip: data.fromCamera.ip,
                cameraID: data.fromCamera.cameraID,
                password: data.fromCamera.password,
                channel: data.fromCamera.channel,
                subtype: data.fromCamera.subtype,
                way: data.fromCamera.cameraPosition[0],
                cameraPosition: data.fromCamera.cameraPosition[1],
                userId: data.fromCamera.id // ถ้ามี userId ส่งมา ให้เชื่อมกับผู้ใช้
            }
        });

        // Log ผลลัพธ์ที่บันทึกลงฐานข้อมูล
        console.log("Data added to database:", result);

        // ส่งผลลัพธ์กลับไปยัง client
        res.status(200).send('Data added successfully');
    } catch (error) {
        // Log error หากมีปัญหาในการบันทึกข้อมูล
        console.error("Error adding data:", error);
        res.status(500).send('Failed to add data');
    }
}

module.exports = {
    addFromData
}

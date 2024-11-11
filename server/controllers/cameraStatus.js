const prisma = require('../config/prisma');
const ping = require('ping');

const startCameraStatusChecker = (io, userId) => {
    const checkStatus = async () => {
        try {


            const cameras = await prisma.camera.findMany({
                where: { userId: userId },
                select: { ip: true }
            });


            // ใช้ Promise.all เพื่อรอการ ping ทั้งหมด
            const pingPromises = cameras.map(camera =>

                ping.promise.probe(camera.ip)
                    .then(res => ({
                        ip: camera.ip,
                        status: res.alive ? 'เชื่อมต่อ' : 'ขาดการเชื่อมต่อ'
                    }))
                    .catch(err => {
                        console.error(`Ping ไม่สำเร็จสำหรับ IP: ${camera.ip}`, err);
                        return { ip: camera.ip, status: 'ขาดการเชื่อมต่อ' };
                    })
            );

            const results = await Promise.all(pingPromises);

            results.forEach(result => {
                io.emit('nodeStatus', result);
            });

        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการตรวจสอบ IP:', error);
        }
    };

    // เริ่มต้นตรวจสอบทันที
    checkStatus();

    // ตั้งค่าให้ตรวจสอบทุกๆ `interval` มิลลิวินาที
    setInterval(checkStatus, 3000);
};

const listDeviceConnection = async (req, res) => {
    const { userId } = req.body
    try {
        const cameraListMunu = await prisma.camera.findMany({
            where: { userId: userId }
        })
        res.json(cameraListMunu)

    } catch (err) {
        return res.status(400).send('เกิดปัญหาจากการดึงข้อมูล');

    }

}
const EditlistDeviceConnection = async (req, res) => {
    const { data } = req.body
    try {
        const cameraListMunu = await prisma.camera.update({
            where: {
                userId: data.userId,
                ip: data.originalIp
            },
            data: {
                ip:data.ip,
                cameraID: data.cameraID,
                password: data.password,
                channel: data.channel,
                subtype: data.subtype,
                way: data.way,
                cameraPosition: data.cameraPosition,
            }
        })

        console.log(data)

        res.json(cameraListMunu)

    } catch (err) {
        return res.status(400).send('เกิดปัญหาจากการดึงข้อมูล');

    }

}
const RemovelistDeviceConnection = async (req, res) => {
    const { data } = req.body
    console.log(data)
    try {
        const cameraListMunu = await prisma.camera.delete({
            where: {
                userId: data.userId,
                ip: data.ip
            }
        })

        res.json(cameraListMunu)

    } catch (err) {
        return res.status(400).send('เกิดปัญหาจากการดึงข้อมูล');

    }

}

module.exports = {
    startCameraStatusChecker,
    listDeviceConnection,
    EditlistDeviceConnection,
    RemovelistDeviceConnection
};

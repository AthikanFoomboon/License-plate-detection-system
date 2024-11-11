const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const socketIo = require('socket.io');
require('dotenv').config();

const gateController = require('./controllers/gateController');
const { initializeStream, snapLicensePlate } = require('./controllers/streamController');
const { checkIP } = require('./controllers/checkIP');
const { startCameraStatusChecker } = require('./controllers/cameraStatus');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json({ limit: "4mb" })); // รวม bodyParser เข้าด้วยกัน
app.use(morgan('dev'));
app.use(cors());



// Load routes dynamically
fs.readdirSync(path.join(__dirname, 'routes')).forEach(file => {
    if (file.endsWith('.js')) {
        const routePath = path.join(__dirname, 'routes', file);
        const route = require(routePath);
        app.use('/api', route);
    }
});

// Serve HLS streams
app.use('/hls', express.static(path.join(__dirname, 'public/hls')));

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('New client connected');


    // เรียกใช้ฟังก์ชันตรวจสอบสถานะกล้อง
    socket.on('nodeIPuser', (Id) => {
    startCameraStatusChecker(io,Id);
})

    // Check IP status
    socket.on('checkIP', async (ip) => {
        try {
            const setCheckIP = await checkIP(ip);
            socket.emit('setCheckIP', setCheckIP);
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการตรวจสอบ IP:', error);
            socket.emit('setCheckIP', { status: 'error', message: 'ไม่สามารถตรวจสอบ IP ได้' });
        }
    });

    // Emit initial gate status
    socket.emit('gateStatus', { isOpen: gateController.getGateStatus() });

    // Handle gate toggle
    socket.on('toggleGate', (data) => {
        if (typeof data.isOpen !== 'boolean') {
            console.error('ข้อมูลสำหรับ toggleGate ไม่ถูกต้อง:', data);
            socket.emit('error', { message: 'ข้อมูลไม่ถูกต้องสำหรับการสลับประตู' });
            return;
        }
        
        try {
            const newStatus = gateController.toggleGate(data.isOpen);
            socket.emit('gateStatus', { isOpen: newStatus });
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการสลับประตู:', error);
            socket.emit('error', { message: 'ไม่สามารถสลับประตูได้' });
        }
    });

    // Handle snapCamera
    socket.on('snapCamera', async (stream) => {
        try {
            await snapLicensePlate(stream);
            // เปลี่ยนจาก io.emit เป็น socket.emit
            socket.emit('statusSnapCamera', { message: 'บันทึกรูปภาพสำเร็จ' });
        } catch (err) {
            console.error('เกิดข้อผิดพลาดในการบันทึกรูปภาพ:', err);
            socket.emit('statusSnapCamera', { message: 'บันทึกรูปภาพไม่สำเร็จ' });
        }
    });
    

    // Handle stream control
    socket.on('startStream', async (id) => {
        try {
            await initializeStream(id);
            socket.emit('streamStatus', { streamId: id, status: 'started' });
        } catch (error) {
            console.error('เกิดข้อผิดพลาดในการเริ่มต้นสตรีม:', error);
            socket.emit('streamStatus', { streamId: id, status: 'error' });
        }
    });

    socket.on('capturecamera', (ip) => {
        socket.emit('streamStatus', { streamId: ip, status: 'started' });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('เกิดข้อผิดพลาดทั่วไป:', err);
    res.status(500).json({ message: 'เกิดข้อผิดพลาดทางเซิร์ฟเวอร์' });
});

// Start the server
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));

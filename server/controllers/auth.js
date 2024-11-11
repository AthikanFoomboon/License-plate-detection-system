const prisma = require('../config/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        // step 1 ตรวจสอบ email password ที่ได้รับ
        const { email, password, village, subdistrict, district, province } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }
        if (!password) {
            return res.status(400).json({ message: "Password is required" });
        }

        // step 2 check Email in DB already
        const user = await prisma.user.findFirst({
            where: {
                email: email
            }
        });

        if (user) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // step 3 HashPassword
        const hashPassword = await bcrypt.hash(password, 10);

        // step 4 Register
        await prisma.user.create({
            data: {
                email: email,
                password: hashPassword,
                village: village,
                subdistrict: subdistrict,
                district: district,
                province: province,
            }
        });

        return res.status(200).json({ message: "Register successfully" });
    } catch (err) {
        console.error('Error during registration:', err);

        // ตรวจสอบข้อผิดพลาดจาก Prisma
        if (err.code === 'P2002') {
            return res.status(400).json({ message: 'Email already exists' });
        }

        // จัดการ error อื่น ๆ
        return res.status(500).json({ message: "An error occurred during registration" });
    }
};

exports.login = async (req, res) => {
    const { email, password, autoLogin } = req.body;

    try {
        // step 1 Check Email
        const user = await prisma.user.findFirst({
            where: {
                email: email
            }
        });

        if (!user || user.role !== "admin") {
            return res.status(400).json({ message: "User not found or not enabled" });
        }

        // step 2 Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid password" });
        }

        // step 3 Create Payload
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            autoLogin: autoLogin ? 'true' : 'false' // ใช้ค่าที่ส่งมาหรือค่าเริ่มต้น
        };

        // step 4 Generate Token
        jwt.sign(payload, process.env.KEY, {}, (err, token) => {
            if (err) {
                return res.status(500).json({ message: "Error generating token" });
            }
            return res.status(200).json({ payload, token });
        });

    } catch (err) {
        console.error('Error during login:', err);
        return res.status(500).json({ message: "An error occurred during login" });
    }
};

exports.currentUser = async (req, res) => {
    try {
        // ดึงข้อมูลผู้ใช้จากฐานข้อมูล
        const user = await prisma.user.findFirst({
            where: {
                email: req.user.email
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // สร้าง payload สำหรับส่งกลับไปที่ client
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role,
            autoLogin: user.autoLogin
        };

        return res.status(200).json(payload);

    } catch (err) {
        console.error('Error fetching current user:', err);
        return res.status(500).json({ message: "An error occurred while fetching the current user" });
    }
};

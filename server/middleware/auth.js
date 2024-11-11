const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma')
// ตรวจสอบว่า มีtokenมาไหม
exports.auth = (req, res, next) => {
    const token = req.headers['authtoken'];
    
    // ตรวจสอบว่ามี token หรือไม่
    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }
    try {
        // ตรวจสอบความถูกต้องของ token
        const decoded = jwt.verify(token, process.env.KEY);  // 'jwtSecret' ต้องตรงกับตอนที่สร้าง token
        // เซ็ตข้อมูล user จาก token ใน request object
        
        req.user = decoded;
        
        // ดำเนินการถัดไป
        next();
    } catch (err) {
        console.log(err);
        // ตอบกลับด้วย 401 ถ้า token ไม่ถูกต้อง
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
exports.adminCheck = async (req, res, next) => {
    const { email } = req.user;
    const user = await prisma.user.findFirst({
        where: {
            email: email
        }
    })

    if (user.role !== 'admin') {
        res.status(403).json({ err: 'Admin Access denied' })
    } else {
        next();
    }
}
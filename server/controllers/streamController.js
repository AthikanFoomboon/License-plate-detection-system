// controllers/streamController.js

// นำเข้าโมดูลที่จำเป็น
const path = require('path'); // ใช้จัดการเส้นทางไฟล์
const fs = require('fs').promises; // ใช้จัดการไฟล์และไดเรกทอรีแบบ Promise
const { spawn } = require('child_process'); // ใช้เรียกใช้กระบวนการใหม่ เช่น FFmpeg
const ping = require('ping'); // ใช้ตรวจสอบการเชื่อมต่อเครือข่ายกับ IP
const treeKill = require('tree-kill'); // ใช้หยุดกระบวนการ FFmpeg ทั้งกระบวนการ
const prisma = require('../config/prisma'); // เชื่อมต่อกับฐานข้อมูลผ่าน Prisma

const SNAPSHOT_PATH = path.join(__dirname, '../snapshots');

// ตัวแปรเก็บข้อมูลกล้อง RTSP ที่ดึงมาจากฐานข้อมูล
let rtspPhotocall = [];

// ตัวแปรสำหรับเก็บช่วงเวลาการ ping และการตั้งค่า setInterval สำหรับแต่ละสตรีม
const pingIntervals = {}; // เก็บ setInterval สำหรับการตรวจสอบการเชื่อมต่อ IP
const streamIntervals = {}; // เก็บ setInterval สำหรับการตรวจสอบและเริ่ม/หยุด FFmpeg

// ฟังก์ชันตั้งค่า RTSP จากฐานข้อมูล
const setRTSP = async (id) => {
  rtspPhotocall = []; // รีเซ็ตข้อมูลกล้องก่อนเริ่ม
  try {
    // ดึงข้อมูลกล้องจากฐานข้อมูลที่ตรงตามเงื่อนไข
    const dataCameras = await prisma.camera.findMany({
      where: {
        userId: id,
        way: {
          in: ['IN', 'OUT'] // ค้นหากล้องที่มีทางเข้าและออก
        },
        cameraPosition: 'FrontCamera' // ตำแหน่งกล้องหน้า
      }
    });

    // วนลูปผ่านข้อมูลกล้องที่ดึงมาและเพิ่มเข้าไปใน rtspPhotocall
    dataCameras.forEach((camera, index) => {
      if ((camera.way === 'In' || camera.way === 'Out') && camera.cameraPosition === 'FrontCamera') {
        if (camera.way === 'In') {
          rtspPhotocall.push({
            id: `stream1`,
            ip: camera.ip, // IP ของกล้อง
            user: camera.cameraID, // ชื่อผู้ใช้สำหรับเข้าถึงกล้อง
            password: camera.password, // รหัสผ่านสำหรับเข้าถึงกล้อง
            channel: camera.channel, // ช่องทางของกล้อง (ถ้ามี)
            subtype: camera.subtype // ประเภทของกล้อง (ถ้ามี)
          });
        }
        if (camera.way === 'Out') {
          rtspPhotocall.push({
            id: `stream2`,
            ip: camera.ip, // IP ของกล้อง
            user: camera.cameraID, // ชื่อผู้ใช้สำหรับเข้าถึงกล้อง
            password: camera.password, // รหัสผ่านสำหรับเข้าถึงกล้อง
            channel: camera.channel, // ช่องทางของกล้อง (ถ้ามี)
            subtype: camera.subtype // ประเภทของกล้อง (ถ้ามี)
          });
        }
      }

    });


  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการตั้งค่า RTSP:', error);
  }
};


// ฟังก์ชันสร้าง URL RTSP สำหรับกล้องแต่ละตัว
const generateRTSPUrl = (camera) => {
  const { user, password, ip, channel, subtype } = camera;
  let url
  // สร้าง URL พื้นฐานสำหรับ RTSP

  if (user && password) {
    url = `rtsp://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${ip}`;
  }
  // ถ้ามี channel และ subtype ให้เพิ่มพารามิเตอร์เข้าไปใน URL
  if (channel && subtype) {
    url += `/cam/realmonitor?channel=${channel}&subtype=${subtype}`;
  }
  return url; // คืนค่า URL ที่สร้างขึ้น
};

// ฟังก์ชันสร้าง URL RTSP สำหรับกล้องทุกตัวใน rtspPhotocall
const getRTSPUrls = () => rtspPhotocall.map(generateRTSPUrl);

// กำหนดเส้นทางสำหรับเก็บไฟล์ HLS
const HLS_PATH = path.join(__dirname, '../public/hls');

// ตัวแปรเก็บกระบวนการ FFmpeg และสถานะการสตรีมสำหรับแต่ละสตรีม
let ffmpegProcesses = {}; // เก็บกระบวนการ FFmpeg สำหรับแต่ละสตรีม
let isStreaming = {}; // เก็บสถานะการสตรีม (true/false) สำหรับแต่ละสตรีม

// ฟังก์ชันตรวจสอบและสร้างไดเรกทอรี HLS หากยังไม่มี
const ensureHlsPathExists = async () => {
  try {
    await fs.mkdir(HLS_PATH, { recursive: true }); // สร้างไดเรกทอรีแบบ recursive ถ้ายังไม่มี
  } catch (err) {
    console.error(`เกิดข้อผิดพลาดในการสร้างไดเรกทอรี HLS: ${err}`);
    throw err; // หยุดการทำงานหากเกิดข้อผิดพลาด
  }
};
// ตรวจสอบและสร้างไดเรกทอรี
const ensurePathExists = async (dir) => {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (err) {
    console.error(`Failed to create directory ${dir}:`, err);
    throw err;
  }
};

// ฟังก์ชันลบไฟล์ HLS สำหรับสตรีมที่ระบุ
const deleteHlsFilesForStream = async (streamId) => {
  try {
    const streamPath = path.join(HLS_PATH, streamId); // เส้นทางของสตรีมที่ต้องการลบไฟล์
    const files = await fs.readdir(streamPath); // อ่านไฟล์ทั้งหมดในไดเรกทอรีสตรีม

    // ลบไฟล์แต่ละไฟล์ในสตรีม
    await Promise.all(files.map(async (file) => {
      const filePath = path.join(streamPath, file);
      await fs.unlink(filePath); // ลบไฟล์
      console.log(`ลบไฟล์: ${file} ใน ${streamId}`);
    }));

    console.log(`ลบไฟล์ HLS ทั้งหมดสำหรับสตรีม ${streamId} เรียบร้อยแล้ว`);
  } catch (err) {
    if (err.code !== 'ENOENT') { // ถ้าไม่พบไดเรกทอรี ให้ข้ามข้อผิดพลาด
      console.error(`เกิดข้อผิดพลาดในการลบไฟล์ HLS สำหรับสตรีม ${streamId}:`, err);
    }
  }
};

// ฟังก์ชันเริ่มต้น FFmpeg สำหรับสตรีมที่ระบุ
const startFFmpeg = async (streamId, rtspUrl, ip) => {
  try {
    const streamDir = path.join(HLS_PATH, streamId); // สร้างเส้นทางไดเรกทอรีสำหรับสตรีม
    await fs.mkdir(streamDir, { recursive: true }); // สร้างไดเรกทอรีหากยังไม่มี

    // กำหนดอาร์กิวเมนต์สำหรับ FFmpeg เพื่อสร้างสตรีม HLS
    const ffmpegArgs = [
      '-fflags', 'nobuffer', // ลดการสะสมบัฟเฟอร์เพื่อการตอบสนองที่ไวขึ้น
      '-flags', '+low_delay', // ตั้งค่าเพื่อให้เกิดความหน่วงต่ำ
      '-rtsp_transport', 'udp', // ใช้ UDP เพื่อลด latency ของ RTSP
      '-i', rtspUrl, // URL ของ RTSP ที่จะสตรีม
      '-c:v', 'libx264', // ใช้ codec x264 สำหรับวิดีโอ
      '-preset', 'ultrafast', // ตั้งค่า preset เร็วที่สุดเพื่อลดการประมวลผล
      '-tune', 'zerolatency', // ตั้งค่าให้มี latency ต่ำ
      '-g', '25', // ลด GOP size เพื่อลดการหน่วง (ค่าที่ต่ำกว่าจะลด latency)
      '-keyint_min', '25', // ลด keyframe interval ให้สอดคล้องกับ GOP size
      '-sc_threshold', '0', // ตั้งค่าเพื่อไม่ให้ ffmpeg คาดการณ์ scene change
      '-f', 'hls', // ใช้รูปแบบ HLS สำหรับการสตรีม
      '-hls_time', '1', // ระยะเวลาแต่ละ segment ใน HLS
      '-hls_list_size', '1', // เพิ่มจำนวนรายการใน playlist ให้เล่นได้ราบรื่นขึ้น
      '-hls_flags', 'delete_segments+omit_endlist', // ลบ segments เก่าเพื่อประหยัดพื้นที่
      '-threads', '2', // จำกัด threads เพื่อให้ CPU ทำงานเบาๆ
      path.join(streamDir, `${streamId}.m3u8`) // เส้นทางไฟล์ HLS ที่จะสร้าง
    ];
    
    // เริ่มกระบวนการ FFmpeg ด้วยอาร์กิวเมนต์ที่กำหนด
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
    let isReceiving = false; // ตัวแปรตรวจสอบว่าเริ่มรับข้อมูลจาก FFmpeg แล้วหรือยัง

    // Listener สำหรับข้อมูลจาก stderr ของ FFmpeg
    ffmpegProcess.stderr.on('data', (data) => {
      const message = data.toString(); // แปลงข้อมูลเป็นสตริง
      if (message.includes('frame=')) { // ตรวจสอบว่ามีการรับเฟรมข้อมูลหรือไม่
        if (!isReceiving) { // ถ้ายังไม่ได้รับข้อมูล
          console.log(`FFmpeg[data]- กำลังดึงข้อมูล กล้อง: ${streamId}`);
          isReceiving = true; // ตั้งค่าให้เป็นจริง
          isStreaming[streamId] = true; // ตั้งค่าสถานะการสตรีมเป็นจริง
        }
      }
    });

    // Listener เมื่อ FFmpeg กระบวนการสิ้นสุด
    ffmpegProcess.on('exit', async (code, signal) => {
      console.error(`FFmpeg[exit]-ไม่พบสัญญาณ Stream ${streamId} หยุดทำงาน รหัสออก: ${code}, สัญญาณ: ${signal}`);
      isStreaming[streamId] = false; // ตั้งค่าสถานะการสตรีมเป็นเท็จ
      ffmpegProcesses[streamId] = null; // ลบข้อมูลกระบวนการ FFmpeg
      await deleteHlsFilesForStream(streamId); // ลบไฟล์ HLS ที่เกี่ยวข้อง
      // รีสตาร์ท FFmpeg เมื่อกระบวนการหยุดทำงาน
      await restartFFmpeg(streamId);
    });

    // Listener เมื่อเกิดข้อผิดพลาดใน FFmpeg
    ffmpegProcess.on('error', (err) => {
      console.error(`FFmpeg[error]- ${streamId} พบข้อผิดพลาด:`, err);
      isStreaming[streamId] = false; // ตั้งค่าสถานะการสตรีมเป็นเท็จ
      ffmpegProcesses[streamId] = null; // ลบข้อมูลกระบวนการ FFmpeg
    });

    // เริ่มต้นการตรวจสอบการเชื่อมต่อของกล้องผ่าน ping
    startPingInterval(streamId, ip);

    // เก็บข้อมูลกระบวนการ FFmpeg เพื่อใช้ในการหยุดในภายหลัง
    ffmpegProcesses[streamId] = ffmpegProcess;
  } catch (error) {
    console.error(`เกิดข้อผิดพลาดในการเริ่ม FFmpeg สำหรับ ${streamId}:`, error);
  }
};

// ฟังก์ชันเริ่มต้นการตรวจสอบการเชื่อมต่อของกล้องผ่าน ping ทุก ๆ 3 วินาที
const startPingInterval = (streamId, ip) => {
  // หากมีการตั้งค่า ping อยู่แล้ว ให้เคลียร์ก่อนเพื่อป้องกันการตั้งค่าซ้ำ
  if (pingIntervals[streamId]) {
    clearInterval(pingIntervals[streamId]);
  }

  // สร้าง setInterval สำหรับตรวจสอบการเชื่อมต่อ IP
  const interval = setInterval(async () => {
    try {
      // ใช้ `count` เพื่อเช็คว่ามีกล้องที่มี IP นี้อยู่ในฐานข้อมูลหรือไม่
      const cameraCount = await prisma.camera.count({
        where: { ip: ip }
      });

      if (cameraCount === 0 && isStreaming[streamId]) {
        console.log('เข้าเงื่อนไข: ไม่มีกล้องที่มี IP นี้ และกำลังสตรีมอยู่');
        await stopFFmpeg(streamId); // หยุด FFmpeg
      } 
      const isAlive = await ping.promise.probe(ip, { timeout: 2 }); // ตรวจสอบการเชื่อมต่อ IP
      if (isAlive.alive) { // ถ้ากล้องตอบสนอง
        if (!isStreaming[streamId]) { // และยังไม่ได้สตรีม
          console.log(`[startPingInterval()]-IP ${ip} ตอบสนอง, เริ่ม FFmpeg สำหรับ ${streamId}`);
          await restartFFmpeg(streamId); // รีสตาร์ท FFmpeg เพื่อเริ่มสตรีม
        }
      } else { // ถ้ากล้องไม่ตอบสนอง
        if (isStreaming[streamId]) { // และกำลังสตรีมอยู่
          console.log(`[startPingInterval()]-IP ${ip} ไม่ตอบสนอง, หยุด FFmpeg สำหรับ ${streamId}`);
          await stopFFmpeg(streamId); // หยุด FFmpeg
        }
      }
    } catch (err) {
      console.error(`เกิดข้อผิดพลาดในการ ping IP ${ip}:`, err);
    }
  }, 3000); // ทุก ๆ 3 วินาที

  // เก็บข้อมูล interval เพื่อใช้ในการหยุดในภายหลัง
  pingIntervals[streamId] = interval;
};

// ฟังก์ชันหยุด FFmpeg สำหรับสตรีมที่ระบุ
const stopFFmpeg = async (streamId) => {
  try {
    const ffmpegProcess = ffmpegProcesses[streamId]; // ดึงกระบวนการ FFmpeg ที่เก็บไว้
    if (ffmpegProcess) { // ถ้ามีกระบวนการ FFmpeg ที่กำลังทำงานอยู่
      await new Promise((resolve, reject) => {
        // ใช้ treeKill หยุดกระบวนการ FFmpeg และกระบวนการลูกทั้งหมด
        treeKill(ffmpegProcess.pid, 'SIGKILL', (err) => {
          if (err) {
            console.error(`ไม่สามารถหยุด FFmpeg สำหรับสตรีม ${streamId}:`, err);
            return reject(err); // ถ้าเกิดข้อผิดพลาดให้ reject promise
          }
          console.log(`[stopFFmpeg()]-หยุดสตรีม ${streamId} สำเร็จ`);
          resolve(); // ถ้าหยุดสำเร็จให้ resolve promise
        });
      });

      ffmpegProcesses[streamId] = null; // ลบข้อมูลกระบวนการ FFmpeg
      isStreaming[streamId] = false; // ตั้งค่าสถานะการสตรีมเป็นเท็จ
      await deleteHlsFilesForStream(streamId); // ลบไฟล์ HLS ที่เกี่ยวข้อง

      // ระบบทำงาน หยุดการตรวจสอบ ping ถ้ามี
      if (pingIntervals[streamId]) {
        clearInterval(pingIntervals[streamId]);
        delete pingIntervals[streamId];
      }

      // เริ่มต้น หยุดการตรวจสอบ เคลียร์ setInterval สำหรับสตรีมนี้ถ้ามีการตั้งค่า
      if (streamIntervals[streamId]) {
        clearInterval(streamIntervals[streamId]);
        delete streamIntervals[streamId];
        console.log(`เคลียร์ setInterval สำหรับสตรีม ${streamId}`);
      }
    }
  } catch (err) {
    console.error(`เกิดข้อผิดพลาดในการหยุด FFmpeg สำหรับสตรีม ${streamId}:`, err);
  }
};

// ฟังก์ชันเริ่มต้น FFmpeg สำหรับสตรีมที่ระบุ
const startFFmpegForStream = async (stream) => {
  const { id, ip } = stream; // ดึง id และ ip ของสตรีม

  // ตรวจสอบว่า setInterval สำหรับสตรีมนี้ถูกตั้งค่าแล้วหรือยัง
  if (streamIntervals[id]) {
    console.log(`มีการตั้งค่า setInterval สำหรับสตรีม ${id} แล้ว`);
    return; // ถ้าถูกตั้งแล้วให้หยุดฟังก์ชัน
  }

  // ถ้ากำลังสตรีมอยู่แล้วไม่ต้องเริ่มใหม่
  if (isStreaming[id]) {
    console.log(`สตรีม ${id} กำลังทำงานอยู่, ไม่ต้องเริ่มใหม่`);
    return;
  }

  try {
    // ตั้งค่า setInterval สำหรับสตรีมนี้เพื่อตรวจสอบการเชื่อมต่อและจัดการ FFmpeg
    streamIntervals[id] = setInterval(async () => {
      try {
        const currentPing = await ping.promise.probe(ip, { timeout: 2 }); // ตรวจสอบการเชื่อมต่อ IP

        if (currentPing.alive) { // ถ้ากล้องตอบสนอง
          if (!isStreaming[id]) { // และยังไม่ได้สตรีม
            console.log(`${ip}: ตอบสนอง, เริ่ม FFmpeg สำหรับ ${id}`);
            await deleteHlsFilesForStream(id); // ลบไฟล์ HLS เก่า
            const rtspUrls = getRTSPUrls(); // รับ URL RTSP ทั้งหมด
            const cameraIndex = rtspPhotocall.findIndex(cam => cam.id === id); // หา index ของกล้องใน rtspPhotocall
            const rtspUrl = rtspUrls[cameraIndex]; // ดึง URL RTSP ของกล้องที่ต้องการ
            await startFFmpeg(id, rtspUrl, ip); // เริ่ม FFmpeg สำหรับสตรีมนี้
          }
        } else { // ถ้ากล้องไม่ตอบสนอง
          if (isStreaming[id]) { // และกำลังสตรีมอยู่
            console.log(`${ip}: ไม่ตอบสนอง, หยุด FFmpeg สำหรับ ${id}`);
            await stopFFmpeg(id); // หยุด FFmpeg
          }
        }
      } catch (err) {
        console.error(`เกิดข้อผิดพลาดในการ ping IP ${ip}:`, err);
      }
    }, 5000); // ทุก ๆ 5 วินาที

    console.log(`ตั้งค่า setInterval สำหรับสตรีม ${id} เรียบร้อยแล้ว`);
  } catch (err) {
    console.error(`ไม่สามารถเริ่มสตรีม ${id} ได้:`, err);
  }
};

// ถ่ายภาพ snapshot โดยใช้ streamId
const snapLicensePlate = async (streamId) => {
  try {
    await ensurePathExists(SNAPSHOT_PATH);

    // ค้นหา URL RTSP จาก streamId
    const stream = rtspPhotocall.find((cam) => cam.id === streamId);
    if (!stream) {
      console.error(`Stream with id ${streamId} not found`);
      return;
    }

    const rtspUrl = generateRTSPUrl(stream);

    const timestamp = new Date().toISOString().replace(/[-T:.]/g, '');
    const snapshotFilename = `${streamId}_${timestamp}.jpg`;
    const snapshotPath = path.join(SNAPSHOT_PATH, snapshotFilename);

    // ใช้ FFmpeg ถ่ายภาพ snapshot
    const ffmpegArgs = [
      '-rtsp_transport', 'udp',
      '-i', rtspUrl,
      '-frames:v', '1',
      '-q:v', '2',
      snapshotPath,
    ];

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

    ffmpegProcess.on('exit', (code) => {
      if (code === 0) {
        console.log(`Snapshot for ${streamId} saved at ${snapshotPath}`);
      } else {
        console.error(`FFmpeg exited with code ${code} for ${streamId}`);
      }
    });

    ffmpegProcess.on('error', (err) => {
      console.error(`FFmpeg error for ${streamId}:`, err);
    });
  } catch (err) {
    console.error(`Error taking snapshot for ${streamId}:`, err);
  }
};

// ฟังก์ชันสำหรับเริ่มต้นสตรีมที่ระบุ
const initializeStream = async (req, res) => {
  const { id, streamId } = req.body
  try {
    await ensureHlsPathExists(); // ตรวจสอบและสร้างไดเรกทอรี HLS หากยังไม่มี
    await setRTSP(id); // ตั้งค่า RTSP จากฐานข้อมูล

    // หาเซ็ตของสตรีมที่ตรงกับ id ที่ระบุ
    const stream = rtspPhotocall.find(cam => cam.id === streamId);
    if (!stream) { // ถ้าไม่พบสตรีมที่มี id ดังกล่าว
      console.error(`ไม่พบสตรีมที่มี id: ${streamId}`);
      return res.status(404).json({ error: `ไม่พบสตรีมที่มี id: ${streamId}` });
    }

    const streamPath = path.join(HLS_PATH, streamId); // กำหนดเส้นทางไดเรกทอรีสำหรับสตรีม
    await fs.mkdir(streamPath, { recursive: true }); // สร้างไดเรกทอรีสำหรับสตรีม

    await startFFmpegForStream(stream); // เริ่มต้น FFmpeg สำหรับสตรีมที่ระบุ

    res.status(200).json({ message: `เริ่มต้นสตรีม ${streamId} สำเร็จ` });
  } catch (err) {
    console.error('ไม่สามารถเริ่มต้นสตรีมได้:', err);
    res.status(500).json({ error: 'ไม่สามารถเริ่มต้นสตรีมได้' });
  }
};

// ฟังก์ชันรีสตาร์ท FFmpeg สำหรับสตรีมที่ระบุ
const restartFFmpeg = async (streamId) => {
  console.log(`[restartFFmpeg()]-รีสตาร์ท FFmpeg สำหรับ ${streamId}`);
  await stopFFmpeg(streamId); // หยุด FFmpeg ปัจจุบันสำหรับสตรีมนี้
  const stream = rtspPhotocall.find(cam => cam.id === streamId); // หาเซ็ตของสตรีมที่ตรงกับ streamId
  if (stream) { // ถ้าพบสตรีมที่มี streamId ดังกล่าว
    await startFFmpegForStream(stream); // เริ่ม FFmpeg ใหม่สำหรับสตรีมนี้
  } else { // ถ้าไม่พบสตรีมที่มี streamId ดังกล่าว
    console.error(`ไม่พบสตรีมที่มี id: ${streamId} สำหรับการรีสตาร์ท`);
  }
};

// ส่งออกฟังก์ชันที่สามารถใช้งานจากไฟล์อื่นได้
module.exports = {
  initializeStream, // ฟังก์ชันสำหรับเริ่มต้นสตรีม
  stopFFmpeg, // ฟังก์ชันสำหรับหยุด FFmpeg
};

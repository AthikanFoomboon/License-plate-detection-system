// controllers/checkIP.js
const ping = require("ping");

const checkIP = async (ip) => {

  return new Promise((resolve) => {
    ping.sys.probe(ip, (isAlive) => {
      let updatedStatus = isAlive ? "up" : "down";
      resolve(updatedStatus); // ส่งค่า updatedStatus กลับเมื่อเช็คเสร็จ
    });
  });
};

module.exports = { checkIP };

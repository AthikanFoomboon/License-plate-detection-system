let isGateOpen = false; // สถานะเริ่มต้นของประตู

// ฟังก์ชันสำหรับการเปิด/ปิดประตู
const toggleGate = (isOpen) => {
  isGateOpen = isOpen; // อัพเดทสถานะของประตู
  console.log(`Gate is now ${isGateOpen ? 'open' : 'closed'}`);
  return isGateOpen; // ส่งสถานะกลับ
};

// ฟังก์ชันสำหรับการดึงสถานะของประตูปัจจุบัน
const getGateStatus = () => {
  return isGateOpen;
};

module.exports = {
  toggleGate,
  getGateStatus,
};

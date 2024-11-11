// ทำต่อจากไฟล์ redusers/index.js >>>
//เริ่ม 3
export function userReducer(state = null, action) {
    switch (action.type) {
        case 'LOGGED_IN_USER':
            return action.payload; // payloadมาจากไหน?  เมื่อเราloginเข้ามา เดี๋ยวก็จะส่งpayloadเข้ามาอยู่เเล้ว
        case 'LOGOUT':             // เดี๋ยวก็จะเก็บค่าของstateนั้น ให้เท่ากับค่าที่ถูกreturn เพื่อเก็บไว้ในstoreต่อไป
            localStorage.clear();  
            return action.payload;
        default:
            return state;
    }
  }
  
  //3.1 ฟังก์ชั่นนี้(userReducer()) จะถูกเรียกใช้จากไฟล์ reducers/index.js
  //3.2 ทำเสร็จเเล้วให้กลับไปหน้าเดิม (redusers/index.js)
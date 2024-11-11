// ทำต่อจากไฟล์ src/index.js >>>
// เริ่ม 2
import { combineReducers } from 'redux';
import { userReducer } from './userReducer';

const rootReducer = combineReducers({
    user: userReducer,
})
export default rootReducer;

// 2.1เมื่อพิมพ์ครบเเล้ว ต่อไปให้สร้างไฟล์ userReducer.js (สร้างในโฟลเดอร์ src/reducers) =>> เริ่ม 3
// 2.2 ไปหน้า src/userReducer.js  เพื่อสร้างstore =>>

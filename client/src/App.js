import React, { useEffect } from 'react';
import './style.css';
import { Route, Routes } from 'react-router-dom';
import Dashboard from './controller/pages/admin/dashborad'; 
import Login from './controller/pages/auth/login';
import ConnectingDevice from './controller/pages/admin/connectingDevice';
import Register from './controller/pages/auth/register';
import SetCamera from './controller/pages/admin/setCamera';
import AdminRoute from './routes/AdminRoute';
import { currentUser } from './functions/auth';
import { useDispatch } from 'react-redux';

function App() {
  const dispatch = useDispatch();
  useEffect(() => {

    const idTokenResult = localStorage.getItem('token');  // ดึง token จาก localStorage
    const autoLogin = localStorage.getItem('autoLogin');  // ดึง token จาก localStorage
    if (idTokenResult) {
      currentUser(idTokenResult)  // เรียกฟังก์ชันเพื่อรับข้อมูลผู้ใช้จาก token
        .then(res => {
          dispatch({
            type: 'LOGGED_IN_USER',
            payload: {
              id: res.data.id,
              email: res.data.email,
              role: res.data.role,
              autoLogin:autoLogin,
              token: idTokenResult,
            },
          });
        })
        .catch(err => {
          dispatch({
            type: 'LOGOUT',
            payload: null,
          });
          console.log(err);
        });
    } else {
      // ถ้าไม่มี token หรือ token หมดอายุ
      dispatch({
        type: 'LOGOUT',
        payload: null,
      });
    }
  }, [dispatch]);  // เพิ่ม user?.autoLogin ใน dependency array เพื่อทำงานเมื่อเปลี่ยนค่า

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/setcamera" element={<AdminRoute><SetCamera /></AdminRoute>} />
        <Route path="/connecting-devices" element={<AdminRoute><ConnectingDevice /></AdminRoute>} />
      </Routes>
    </div>
  );
}

export default App;

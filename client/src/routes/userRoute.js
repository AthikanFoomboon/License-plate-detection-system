import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';

const UserRoute = ({ children }) => {
    const user = useSelector(state => state.user);

    // ถ้าผู้ใช้ล็อกอินอยู่ แสดง children
    return user && user.token ? children : <Navigate to="/login" replace />;
}

export default UserRoute;

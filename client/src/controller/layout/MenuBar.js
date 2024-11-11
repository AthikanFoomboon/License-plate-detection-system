// src/components/MenuBar.js
import React, { useState, useEffect } from 'react';
import { VideoCameraOutlined, AliyunOutlined, ApiOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import './styles/MenuBar.css'; // นำเข้าไฟล์ CSS สำหรับ MenuBar

const MenuBar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [current, setCurrent] = useState('');

    useEffect(() => {
        // Map path to key dynamically
        const pathToKey = {
            '/dashboard': 'Dashboard',
            '/setcamera': 'setCamera',
            '/connecting-devices': 'Devices',
        };
        const key = pathToKey[location.pathname] || 'Dashboard'; // Default to 'Dashboard'
        setCurrent(key);
    }, [location]);

    const items = [
        {
            label: 'แผงควบคุม',
            key: 'Dashboard',
            icon: <AliyunOutlined />,
        },
        {
            label: 'ตั้งค่ากล้อง',
            key: 'setCamera',
            icon: <VideoCameraOutlined />,
        },
        {
            label: 'อุปกรณ์เชื่อมต่อ',
            key: 'Devices',
            icon: <ApiOutlined />,
        },
    ];

    const onClick = (e) => {
        setCurrent(e.key);
        const keyToPath = {
            Dashboard: '/dashboard',
            setCamera: '/setcamera',
            Devices: '/connecting-devices',
        };
        navigate(keyToPath[e.key]);
    };

    return (
        <Menu
            onClick={onClick}
            selectedKeys={[current]}
            mode="horizontal"
            theme="dark" // ตั้งค่า theme เป็น dark
            items={items}
            className="custom-menu-bar" // เพิ่ม class สำหรับการปรับแต่งเพิ่มเติม
        />
    );
};

export default MenuBar;

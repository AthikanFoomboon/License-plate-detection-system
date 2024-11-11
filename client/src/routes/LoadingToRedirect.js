import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flex, Spin } from 'antd';

const LoadingToRedirect = () => {
    const [count, setCount] = useState(3);
    const navigate = useNavigate();

    useEffect(() => {
        const interval = setInterval(() => {
            setCount((currentCount) => --currentCount);
        }, 850);
        // redirect
        count === 0 && navigate('/login');
        return () => clearInterval(interval);
    }, [count, navigate]);

    return (
        <Flex
        align="center" // Maintain vertical centering
        justify="center" // Add horizontal centering
        gap="middle"
        style={{position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)'}} //ปรับให้อยู่กลาง
    >
        <Spin size="large" />
    </Flex>
    
    );
};

export default LoadingToRedirect;

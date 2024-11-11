// src/components/EntranceGate.js

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CameraOutlined } from '@ant-design/icons';
import '../layout/styles/EntranceGate.css';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import ListTable from './Table';
import StatusDrawer from './StatusDrawer';
import { io } from 'socket.io-client';
import { streaming_API } from '../../functions/LPR';
import { useSelector } from 'react-redux';

const SOCKET_SERVER_URL = 'http://localhost:8080';

const EntranceGate = ({ it }) => {
    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const socketRef = useRef(null);
    const timerRef = useRef(null);

    const [isOpen, setIsOpen] = useState(false);
    const [streamId, setStreamID] = useState(null);
    const [nodeStatuses, setNodeStatuses] = useState([]);
    const [streamStatuses, setStreamStatuses] = useState([]);
    const [drawerVisible, setDrawerVisible] = useState(false);
    const [playerDisabled, setPlayerDisabled] = useState(false);

    const user = useSelector(state => state.user);

    // ตั้งค่า streamId ตาม it.vdo
    useEffect(() => {
        const streamMapping = { "1": 'stream1', "2": 'stream2' };
        const newStreamId = streamMapping[it.vdo];

        if (newStreamId) {
            setStreamID(newStreamId);
        } else {
            console.warn(`Unknown vdo value: ${it.vdo}`);
        }
    }, [it.vdo]);

    // การเชื่อมต่อ Socket.io เมื่อ component mount และทำการ cleanup เมื่อ unmount
    useEffect(() => {
        if (user && user.token) {
            socketRef.current = io(SOCKET_SERVER_URL, {
                transports: ['websocket'],
                auth: {
                    token: user.token
                },
                query: {
                    userId: user.id
                }
            });

            socketRef.current.on('connect', () => {
                console.log('เชื่อมต่อกับเซิร์ฟเวอร์ Socket.IO สำเร็จ');
            });

            socketRef.current.on('connect_error', (error) => {
                console.error('การเชื่อมต่อ Socket.IO ล้มเหลว:', error);
            });

            return () => {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                    console.log('ตัดการเชื่อมต่อ Socket.IO เมื่อ unmount');
                }
            };
        }
    }, [user]);

    // ฟังก์ชันสำหรับรีเซ็ต timer
    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            console.warn('No data received for 15 seconds. Disposing player.');
            handleConnectionError();
            setPlayerDisabled(true);
        }, 15000); // 15 วินาที
    }, []);

    // เรียกใช้ API สำหรับ streaming เมื่อมี user และ streamId
    useEffect(() => {
        if (user && user.token && streamId) {
            const data = { ...user, streamId };
            streaming_API(user.token, data)
                .then(res => {
                    console.log('Streaming API Response:', res);
                })
                .catch(err => {
                    console.error('Streaming API Error:', err);
                });
        }
    }, [user, streamId]);

    // ตั้งค่า Video.js player
    useEffect(() => {
        if (!playerDisabled && videoRef.current && streamId) {
            // Dispose previous player instance if exists
            if (playerRef.current) {
                playerRef.current.dispose();
            }

            // Initialize Video.js player
            playerRef.current = videojs(videoRef.current, {
                controls: false,
                autoplay: true,
                preload: 'auto',
                fluid: true,
                sources: [{
                    src: `http://localhost:8080/hls/${streamId}/${streamId}.m3u8`,
                    type: 'application/x-mpegURL'
                }]
            });

            // ฟังก์ชันจัดการข้อผิดพลาดของ player
            const onPlayerError = () => {
                const error = playerRef.current.error();
                console.error('Video.js error:', error);
                alert(`Video.js error: ${error.message} StreamError: ${streamId}`);
                handleConnectionError();
            };

            // Event listeners
            playerRef.current.on('ready', () => {
                console.log('Video player is ready.');
                resetTimer();
            });

            playerRef.current.on('playing', resetTimer);
            playerRef.current.on('progress', resetTimer);
            playerRef.current.on('error', onPlayerError);
            playerRef.current.on('dispose', handleConnectionError);
            playerRef.current.on('playlistitem', () => {
                const currentPlaylist = playerRef.current.playlist();
                if (!currentPlaylist || !currentPlaylist.length) {
                    console.error('Playlist is empty or undefined.');
                    handleConnectionError();
                }
            });

            // Cleanup function
            return () => {
                if (playerRef.current) {
                    playerRef.current.dispose();
                }
                if (timerRef.current) {
                    clearTimeout(timerRef.current);
                }
            };
        }
    }, [streamId, playerDisabled, resetTimer]);

    // ฟังก์ชันจัดการข้อผิดพลาดการเชื่อมต่อ
    const handleConnectionError = useCallback(() => {
        console.error('Connection error encountered. Resetting states.');
        resetPlayer();
        setPlayerDisabled(true);
    }, [resetPlayer]);

    // ฟังก์ชันรีเซ็ต player
    const resetPlayer = useCallback(() => {
        if (playerRef.current) {
            playerRef.current.dispose();
            playerRef.current = null;
        }
        setNodeStatuses([]);
        setStreamStatuses([]);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
    }, []);

    // ตั้งค่า event listeners สำหรับ Socket.io
    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        // ฟังก์ชันจัดการ gateStatus
        const handleGateStatus = (data) => setIsOpen(data.isOpen);

        // ฟังก์ชันจัดการ streamStatus
        const handleStreamStatus = (data) => {
            setStreamStatuses(prevStatuses => {
                const index = prevStatuses.findIndex(stream => stream.streamId === data.streamId);
                if (index !== -1) {
                    const updatedStatuses = [...prevStatuses];
                    updatedStatuses[index] = data;
                    return updatedStatuses;
                } else {
                    return [...prevStatuses, data];
                }
            });
        };

        // ฟังก์ชันจัดการ nodeStatus
        const handleNodeStatus = (data) => {
            setNodeStatuses(prevStatuses => {
                const index = prevStatuses.findIndex(node => node.ip === data.ip);
                if (index !== -1) {
                    const updatedStatuses = [...prevStatuses];
                    updatedStatuses[index] = data;
                    return updatedStatuses;
                } else {
                    return [...prevStatuses, data];
                }
            });
        };

        // ฟังก์ชันจัดการ snapCamera status
        const handleSnapStatus = (status) => {
            console.log('Snap Camera Status:', status);
        };

        // ตั้งค่า listeners
        socket.on('gateStatus', handleGateStatus);
        socket.on('streamStatus', handleStreamStatus);
        socket.on('nodeStatus', handleNodeStatus);
        socket.on('statusSnapCamera', handleSnapStatus);

        // ส่ง nodeIPuser หลังจากเชื่อมต่อ
        socket.emit('nodeIPuser', user.id);

        // Cleanup event listeners on unmount
        return () => {
            socket.off('gateStatus', handleGateStatus);
            socket.off('streamStatus', handleStreamStatus);
            socket.off('nodeStatus', handleNodeStatus);
            socket.off('statusSnapCamera', handleSnapStatus);
        };
    }, [user.id]);

    // ฟังก์ชัน toggle gate
    const toggleGate = useCallback(() => {
        const socket = socketRef.current;
        if (socket && user) {
            const newStatus = !isOpen;
            socket.emit('toggleGate', { isOpen: newStatus });
        }
    }, [isOpen, user]);

    // ฟังก์ชันแสดงและปิด drawer
    const showDrawer = useCallback(() => setDrawerVisible(true), []);
    const onCloseDrawer = useCallback(() => setDrawerVisible(false), []);

    // ฟังก์ชันจัดการการบันทึก Screenshot
    const handleSaveScreenshot = useCallback(() => {
        const socket = socketRef.current;
        if (socket && streamId) {
            socket.emit('snapCamera', streamId);
        }
    }, [streamId]);

    return (
        <div className="container">
            <StatusDrawer
                open={drawerVisible}
                onClose={onCloseDrawer}
                nodeStatuses={nodeStatuses}
                streamStatuses={streamStatuses}
                placement={'left'}
            />

            <div className="video">
                <div className="video-container">
                    <video
                        ref={videoRef}
                        className="video-js vjs-default-skin"
                        muted
                        preload="auto"
                        style={{ width: "100%", height: "auto" }}
                    />
                    <CameraOutlined
                        className="save-icon"
                        title="Save Screenshot"
                        onClick={handleSaveScreenshot}
                    />
                </div>
            </div>

            <div className="in-container">
                <p className="way">{it.way}</p>
                <div className="fucus">
                    <img
                        src="https://f.ptcdn.info/132/053/000/ouwy2o94le32EluA6yL-o.jpg"
                        alt='Focus'
                    />
                </div>
            </div>

            <div className="box1"><p>{it.result}</p></div>

            <div className="box2">
                <button className="toggle-button" onClick={toggleGate}>
                    {isOpen ? 'Close Gate' : 'Open Gate'}
                </button>
            </div>

            <div className="box3"><ListTable /></div>

            <div className="footer">
                <div className="box4" onClick={showDrawer}></div>
            </div>
        </div>
    );
};

export default EntranceGate;

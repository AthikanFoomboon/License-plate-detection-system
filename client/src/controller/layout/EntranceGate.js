// src/components/EntranceGate.js

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CameraOutlined, ReloadOutlined } from '@ant-design/icons';
import '../layout/styles/EntranceGate.css';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import ListTable from './Table';
import StatusDrawer from './StatusDrawer';
import { io } from 'socket.io-client';
import { streaming_API } from '../../functions/LPR';
import { useSelector } from 'react-redux';
import { message } from 'antd';

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
    const [isLoading, setIsLoading] = useState(true); // สถานะการโหลด

    const user = useSelector(state => state.user);

    useEffect(() => {
        if (!it || !it.vdo) {
            console.warn("it หรือ it.vdo ยังไม่ถูกกำหนด");
            setIsLoading(true);
            return;
        }

        const streamMapping = { "1": 'stream1', "2": 'stream2' };
        const newStreamId = streamMapping[it.vdo];

        if (newStreamId) {
            setStreamID(newStreamId);
            setIsLoading(false);
            // เก็บ streamId ใน localStorage (ถ้าต้องการ)
            localStorage.setItem('streamId', newStreamId);
        } else {
            console.warn(`Unknown vdo value: ${it.vdo}`);
            setIsLoading(false);
        }
    }, [it]);

    // โหลด streamId จาก localStorage เมื่อ component mount (ถ้าต้องการ)
    useEffect(() => {
        const savedStreamId = localStorage.getItem('streamId');
        if (savedStreamId && !streamId) {
            setStreamID(savedStreamId);
            setIsLoading(false);
        }
    }, [streamId]);

    const resetAll = useCallback(() => {
        setIsOpen(false);
        setNodeStatuses([]);
        setStreamStatuses([]);
        setPlayerDisabled(false);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        console.log('All states have been reset.');
    }, []);

    const handleConnectionError = useCallback(() => {
        console.error('Connection error encountered. Resetting states.');
        resetAll();
        setPlayerDisabled(true);
    }, [resetAll]);

    const handleRefresh = useCallback(() => {
        window.location.reload();
    }, []);

    useEffect(() => {
        if (user && user.token) {
            socketRef.current = io(SOCKET_SERVER_URL, {
                transports: ['websocket'],
                auth: { token: user.token },
                query: { userId: user.id }
            });

            socketRef.current.on('connect', () => {
                console.log('Connected to Socket.IO server.');
            });

            socketRef.current.on('connect_error', (error) => {
                console.error('Socket.IO connection failed:', error);
            });

            return () => {
                if (socketRef.current) {
                    socketRef.current.disconnect();
                    console.log('Disconnected from Socket.IO server.');
                }
            };
        }
    }, [user]);

    useEffect(() => {
        if (user && user.token && streamId) {
            const data = { ...user, streamId };
            streaming_API(user.token, data)
                .then(res => {
                    if (res && res.data) {
                        console.log('Streaming API Response:', res.data);
                    } else {
                        console.warn('Streaming API returned incomplete data.');
                    }
                })
                .catch(err => {
                    console.error('Streaming API Error:', err);
                });
        }
    }, [user, streamId]);

    useEffect(() => {
        if (isLoading) return; // ไม่โหลดวิดีโอถ้ายังกำลังโหลด

        if (videoRef.current && streamId && !playerDisabled) {
            if (!playerRef.current) {
                playerRef.current = videojs(videoRef.current, {
                    controls: false,
                    autoplay: true,
                    preload: 'auto',
                    fluid: true,
                    sources: [{
                        src: `http://localhost:8080/hls/${streamId}/${streamId}.m3u8`,
                        type: 'application/x-mpegURL'
                    }]
                }, () => {
                    console.log('Video.js player initialized.');
                });

                playerRef.current.on('error', () => {
                    const error = playerRef.current?.error();
                    console.error('Video.js Error:', error);
                    handleConnectionError();
                });
            } else {
                playerRef.current.src({
                    type: 'application/x-mpegURL',
                    src: `http://localhost:8080/hls/${streamId}/${streamId}.m3u8`
                });
                playerRef.current.play().catch(err => {
                    console.error('Error playing the stream:', err);
                });
            }

            return () => {
                if (playerRef.current) {
                    try {
                        playerRef.current.dispose();
                        console.log('Video.js player disposed.');
                    } catch (error) {
                        console.error('Error disposing player:', error);
                    }
                    playerRef.current = null;
                }
            };
        }
    }, [streamId, playerDisabled, handleConnectionError, isLoading]);

    useEffect(() => {
        const socket = socketRef.current;
        if (!socket) return;

        const handleGateStatus = (data) => setIsOpen(data.isOpen);
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

        const handleSnapStatus = (status) => {
            message.success(status.message)
        };

        socket.on('gateStatus', handleGateStatus);
        socket.on('streamStatus', handleStreamStatus);
        socket.on('nodeStatus', handleNodeStatus);
        socket.on('statusSnapCamera', handleSnapStatus);

        socket.emit('nodeIPuser', user.id);

        return () => {
            socket.off('gateStatus', handleGateStatus);
            socket.off('streamStatus', handleStreamStatus);
            socket.off('nodeStatus', handleNodeStatus);
            socket.off('statusSnapCamera', handleSnapStatus);
        };
    }, [user.id]);

    const toggleGate = useCallback(() => {
        const socket = socketRef.current;
        if (socket && user) {
            const newStatus = !isOpen;
            socket.emit('toggleGate', { isOpen: newStatus });
        }
    }, [isOpen, user]);

    const showDrawer = useCallback(() => setDrawerVisible(true), []);
    const onCloseDrawer = useCallback(() => setDrawerVisible(false), []);

    const handleSnapScreenshot = useCallback(() => {
        const socket = socketRef.current;
        if (streamId) {
            console.log('Emitting snapCamera with streamId:', streamId);
            socket.emit('snapCamera', streamId);
        } else {
            console.warn('streamId is null. Cannot emit snapCamera.');
        }
    }, [streamId]);

    if (isLoading) {
        return <div className="loading">Loading...</div>;
    }

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
                        title="Snap Screenshot"
                        onClick={handleSnapScreenshot}
                    />
                    <ReloadOutlined
                        className="refresh-icon"
                        title="Refresh Page"
                        onClick={handleRefresh}
                    />
                </div>
            </div>

            <div className="in-container">
                <p className="way">{it.way}</p>
                <div className="fucus">
                    <img
                        src="https://image.makewebeasy.net/makeweb/m_1200x600/zVseqqX0B/migrate/product_other-20121203-1506532.jpg"
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

        </div>
    );
};

export default EntranceGate;

// components/StatusDrawer.js

import React from 'react';
import { Drawer, List, Typography, Divider } from 'antd';
import { FaCheckCircle, FaTimesCircle, FaPlayCircle, FaStopCircle } from 'react-icons/fa';

const { Title } = Typography;

const StatusDrawer = ({ open, onClose, nodeStatuses, streamStatuses, placement }) => {


    return (
        <Drawer
            title="สถานะอุปกรณ์เชื่อมต่อ"
            placement={placement}
            onClose={onClose}
            open={open}
            width={400}
        >
            {/* Node Status */}
            <Title level={4}>กล้อง</Title>
            <List
                itemLayout="horizontal"
                dataSource={nodeStatuses}
                renderItem={item => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={
                                item.status === 'เชื่อมต่อ' ? (
                                    <FaCheckCircle style={{ color: 'green', fontSize: '20px' }} />
                                ) : (
                                    <FaTimesCircle style={{ color: 'red', fontSize: '20px' }} />
                                )
                            }
                            title={item.ip}
                            description={`สถานะ: ${item.status}`}
                        />
                    </List.Item>
                )}
            />
            <Divider />
            {/* Stream Status */}
            <Title level={4}>อุปกรณ์เชื่อมต่อ</Title>
            <List
                itemLayout="horizontal"
                dataSource={streamStatuses}
                renderItem={item => (
                    <List.Item>
                        <List.Item.Meta
                            avatar={
                                item.status === 'started' ? (
                                    <FaPlayCircle style={{ color: 'blue', fontSize: '20px' }} />
                                ) : (
                                    <FaStopCircle style={{ color: 'gray', fontSize: '20px' }} />
                                )
                            }
                            title={`Stream ${item.streamId}`}
                            description={`สถานะ: ${item.status.toUpperCase()}`}
                        />
                    </List.Item>
                )}
            />
        </Drawer>
    );
};

export default StatusDrawer;

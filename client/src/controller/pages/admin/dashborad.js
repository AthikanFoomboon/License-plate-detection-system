import React, { useEffect, useState } from 'react';
import { Col, Tooltip, Row } from 'antd';
import { ApartmentOutlined, SwapOutlined, EditOutlined, PlayCircleOutlined } from '@ant-design/icons';
import EntranceGate from '../../layout/EntranceGate';
import MenuBar from '../../layout/MenuBar';
import './styles/Dashboard.css';
import StatusDrawer from '../../layout/StatusDrawer';
import io from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:8080';

function Dashboard() {  
  const defaultWay1 = { way: 'IN', vdo: "1", result: "กก 8888" };
  const defaultWay2 = { way: 'OUT', vdo: "2", result: "ขข 9999" };

  const [way1, setWay1] = useState(() => {
    const savedWay1 = localStorage.getItem('way1');
    return savedWay1 ? JSON.parse(savedWay1) : defaultWay1;
  });

  const [way2, setWay2] = useState(() => {
    const savedWay2 = localStorage.getItem('way2');
    return savedWay2 ? JSON.parse(savedWay2) : defaultWay2;
  });

  const [nodeStatuses, setNodeStatuses] = useState([]);
  const [streamStatuses, setStreamStatuses] = useState([]);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [currentAction, setCurrentAction] = useState(null); 

  useEffect(() => {
    const newSocket = io(SOCKET_SERVER_URL, { transports: ['websocket'] });

    newSocket.on('connect', () => {
      console.log('เชื่อมต่อกับ Socket.io server สำเร็จแล้ว');
    });

    newSocket.on('streamStatus', (data) => {
      setStreamStatuses(prev => {
        const index = prev.findIndex(stream => stream.streamId === data.streamId);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        return [...prev, data];
      });
    });

    newSocket.on('nodeStatus', (data) => {
      setNodeStatuses(prev => {
        const index = prev.findIndex(node => node.ip === data.ip);
        if (index !== -1) {
          const updated = [...prev];
          updated[index] = data;
          return updated;
        }
        return [...prev, data];
      });
    });

    return () => {
      newSocket.disconnect();
      console.log('ตัดการเชื่อมต่อจาก Socket.io server แล้ว');
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('way1', JSON.stringify(way1));
  }, [way1]);

  useEffect(() => {
    localStorage.setItem('way2', JSON.stringify(way2));
  }, [way2]);

  const showDrawer = (action) => {
    setCurrentAction(action);
    setDrawerVisible(true);
  };

  const onCloseDrawer = () => {
    setDrawerVisible(false);
    setCurrentAction(null);
  };

  // ฟังก์ชันสำหรับสลับ way1 และ way2
  const handleSwap = () => {
    setWay1(way2);
    setWay2(way1);
  };

  return (
    <div className="dashboard-container">
      <MenuBar />
      <Row className="dashboard-row">

        <Col className="dashboard-col-left">
          <EntranceGate it={way1} />
        </Col>

        <Col className="dashboard-col-middle">
          <div className="middle-content">
            <Tooltip title="สลับ">
              <SwapOutlined className="action-icon" onClick={handleSwap} />
            </Tooltip>
            <Tooltip title="เช็คสถานะกล้อง">
              <ApartmentOutlined className="action-icon" onClick={() => showDrawer('checkStatus')} />
            </Tooltip>
            <Tooltip title="แก้ไข IP กล้องใหม่">
              <EditOutlined className="action-icon" onClick={() => showDrawer('editIP')} />
            </Tooltip>
            <Tooltip title="เริ่มต้นการ Stream ใหม่">
              <PlayCircleOutlined className="action-icon" onClick={() => showDrawer('startStream')} />
            </Tooltip>
          </div>
        </Col>

        <Col className="dashboard-col-right">
          <EntranceGate it={way2} />
        </Col>
      </Row>

      <StatusDrawer
        open={drawerVisible}
        onClose={onCloseDrawer}
        nodeStatuses={nodeStatuses}
        streamStatuses={streamStatuses}
        placement={'left'}
        currentAction={currentAction}
      />
    </div>
  );
}

export default Dashboard;

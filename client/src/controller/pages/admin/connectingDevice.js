import React, { useState, useEffect } from 'react';
import MenuBar from '../../layout/MenuBar';
import { Space, Table, Tag, Button, message, Spin, Modal, Form, Input } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import './styles/ConnectingDevice.css';
import { useSelector } from 'react-redux';
import { editListDeviceConnection_AIP, listDeviceConnection_API, removeListDeviceConnection } from '../../../functions/LPR';

const ConnectingDevice = () => {
  const { Column } = Table;
  const [dataCameras, setDataCameras] = useState([]);
  const [loading, setLoading] = useState(false);
  const user = useSelector((state) => state.user);
  const idTokenResult = localStorage.getItem('token');

  // State สำหรับ Modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!user || !user.id) {
      message.error('User information is missing.');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await listDeviceConnection_API(idTokenResult, user.id);
        setDataCameras(Array.isArray(res) ? res : []);
      } catch (err) {
        console.error('Error fetching device connections:', err);
        message.error('เกิดข้อผิดพลาดในการดึงข้อมูลอุปกรณ์ที่เชื่อมต่อ');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [idTokenResult, user]);

  const formatDateTime = (dateTimeString) => {
    try {
      const options = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      };
      return new Intl.DateTimeFormat('en-GB', options).format(new Date(dateTimeString));
    } catch (error) {
      console.error('Error formatting date:', error);
      return dateTimeString;
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setIsModalVisible(true);
    form.setFieldsValue({
      ip: record.ip,
      way: record.way,
      cameraPosition: record.cameraPosition,
      cameraID: record.cameraID,
      password: record.password,
      channel: record.channel, // ค่าเริ่มต้นสำหรับ channel
      subtype: record.subtype, // ค่าเริ่มต้นสำหรับ subtype
      // เพิ่มฟิลด์อื่นๆที่ต้องการแก้ไขที่นี่
    });
  };

  const handleDelete = (record) => {
    // เพิ่มฟังก์ชันการลบที่นี่
    removeListDeviceConnection(idTokenResult,record).then(res=>{
      message.success(`ลบข้อมูลอุปกรณ์: ${record.ip}`);

    }).catch(err=>{
      message.error(`ลบข้อมูลอุปกรณ์wไม่สำเร็จ`);

    })
    // ตัวอย่างการอัปเดตสถานะหลังลบ:
    setDataCameras((prevData) => prevData.filter((item) => item.id !== record.id));
  };

  const getTagColor = (tag) => {
    switch (tag) {
      case 'Member':
        return 'green';
      case 'Guest':
        return 'geekblue';
      case 'Period':
        return 'gold';
      default:
        return 'default';
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingRecord(null);
    form.resetFields();
  };

  const handleEditConfirm = async () => {
    try {
      const values = await form.validateFields();

      // สร้างอ็อบเจ็กต์ที่ส่งไปยัง API รวมถึง IP เดิม
      const updatedValues = {
        ...values,
        userId: user.id,
        id: editingRecord.id,
        originalIp: editingRecord.ip, // เพิ่ม IP เดิม
      };

      // อัปเดตข้อมูลในสถานะ dataCameras
      setDataCameras((prevData) =>
        prevData.map((item) =>
          item.id === editingRecord.id ? { ...item, ...values } : item
        )
      );

      // เรียกใช้ API สำหรับการแก้ไขข้อมูลบนเซิร์ฟเวอร์
      await editListDeviceConnection_AIP(idTokenResult, updatedValues);

      message.success('แก้ไขข้อมูลอุปกรณ์สำเร็จ');
      setIsModalVisible(false);
      setEditingRecord(null);
      form.resetFields();
    } catch (error) {
      console.error('Error updating device:', error);
      if (error.response && error.response.data && error.response.data.error) {
        message.error(`Error: ${error.response.data.error}`);
      } else {
        message.error('เกิดข้อผิดพลาดในการแก้ไขข้อมูลอุปกรณ์');
      }
    }
  };

  return (
    <div>
      <MenuBar />
      {loading ? (
        <div className="loading-spinner">
          <Spin size="large" />
        </div>
      ) : (
        <>
          <Table
            className="list-table2"
            dataSource={dataCameras}
            scroll={{ y: 400 }} // ปรับความสูงตามต้องการ
            rowKey="id" // ใช้ unique identifier เช่น 'id'
            pagination={{ pageSize: 10 }}
          >
            <Column
              title="Created At"
              dataIndex="createdAt"
              key="createdAt"
              render={(createdAt) => formatDateTime(createdAt)}
            />
            <Column title="IP Address" dataIndex="ip" key="ip" />
            <Column title="Way" dataIndex="way" key="way" />
            <Column title="Installation Point" dataIndex="cameraPosition" key="cameraPosition" />
            <Column title="Channel" dataIndex="channel" key="channel" />
            <Column title="Subtype" dataIndex="subtype" key="subtype" />
            <Column
              title="Status"
              dataIndex="tags"
              key="tags"
              render={(tags) =>
                Array.isArray(tags) ? (
                  <>
                    {tags.map((tag, index) => (
                      <Tag color={getTagColor(tag)} key={`${tag}-${index}`} className="custom-tag2">
                        {tag.toUpperCase()}
                      </Tag>
                    ))}
                  </>
                ) : (
                  <Tag color="default">NO TAGS</Tag>
                )
              }
            />
            <Column
              title="Action"
              key="action"
              render={(_, record) => (
                <Space size="middle">
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<EditOutlined />}
                    size="small"
                    className="action-button edit-button2"
                    onClick={() => handleEdit(record)}
                  />
                  <Button
                    type="primary"
                    danger
                    shape="circle"
                    icon={<DeleteOutlined />}
                    size="small"
                    className="action-button delete-button2"
                    onClick={() => handleDelete(record)}
                  />
                </Space>
              )}
            />
          </Table>

          {/* Modal สำหรับการแก้ไขข้อมูล */}
          <Modal
            title="Edit Device"
            open={isModalVisible}
            onOk={handleEditConfirm}
            onCancel={handleCancel}
            okText="Confirm"
            cancelText="Cancel"
          >
            <Form
              form={form}
              layout="vertical"
              name="editDeviceForm"
              initialValues={{
                ip: editingRecord?.ip,
                way: editingRecord?.way,
                cameraPosition: editingRecord?.cameraPosition,
                cameraID: editingRecord?.cameraID,
                password: editingRecord?.password,
                channel: editingRecord?.channel, // ค่าเริ่มต้นสำหรับ channel
                subtype: editingRecord?.subtype, // ค่าเริ่มต้นสำหรับ subtype
                // เพิ่มฟิลด์อื่นๆที่ต้องการแก้ไขที่นี่
              }}
            >
              <Form.Item
                name="ip"
                label="IP Address"
                rules={[
                  { required: true, message: 'Please input the IP Address!' },
                
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="way"
                label="Way"
                rules={[{ required: true, message: 'Please input the Way!' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="cameraPosition"
                label="Installation Point"
                rules={[{ required: true, message: 'Please input the Installation Point!' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="cameraID"
                label="Camera ID"
              >
                <Input />
              </Form.Item>
              <Form.Item
                name="password"
                label="Password"
              >
                <Input.Password />
              </Form.Item>
              {/* เพิ่มฟิลด์ Channel */}
              <Form.Item
                name="channel"
                label="Channel"
              >
                <Input />
              </Form.Item>
              {/* เพิ่มฟิลด์ Subtype */}
              <Form.Item
                name="subtype"
                label="Subtype"
              >
                <Input />
              </Form.Item>
              {/* เพิ่มฟิลด์อื่นๆที่ต้องการแก้ไขที่นี่ */}
            </Form>
          </Modal>
        </>
      )}
    </div>
  );
};

export default ConnectingDevice;

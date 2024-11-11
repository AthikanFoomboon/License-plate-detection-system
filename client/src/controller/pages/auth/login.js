import React from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom'; // นำเข้าจาก react-router-dom

import { Button, Checkbox, Form, Input } from 'antd';
import { LoginHeadler } from '../../../functions/auth';

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ฟังก์ชันเมื่อฟอร์มส่งสำเร็จ
  const onFinish = (values) => {
    LoginHeadler(values).then((res) => {
      console.log(res)
      console.log('id====',res.data.payload.id)
      dispatch({
        type: 'LOGGED_IN_USER',
        payload: {
          id:res.data.payload.id,
          token: res.data.token,
          name: res.data.payload.name,
          role: res.data.payload.role,
          autoLogin:res.data.payload.autoLogin

        },
        
      });
      roleBasedRedirect(res.data.payload.role);



      localStorage.setItem('token', res.data.token);
      localStorage.setItem('autoLogin', res.data.payload.autoLogin);
    }).catch((err) => {
      console.log(err)
    })
    
  };

  const roleBasedRedirect = (res) => {
    if (res === 'admin') {
      navigate('/dashboard'); // ไปที่ path `/`
    } else {
      navigate('/'); // ไปที่ path `/`
    }
};

  // ฟังก์ชันเมื่อฟอร์มส่งไม่สำเร็จ
  const onFinishFailed = (errorInfo) => {
    console.log('Failed:', errorInfo);
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#f0f2f5'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '400px',
        padding: '24px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: '24px' }}>ลงชื่อเข้าใช้</h2>
        <Form
          name="basic"
          labelCol={{ span: 6 }}
          wrapperCol={{ span: 18 }}
          initialValues={{ remember: true }}
          onFinish={onFinish}
          onFinishFailed={onFinishFailed}
          autoComplete="off"
        >
          {/* ช่องกรอกชื่อผู้ใช้ */}
          <Form.Item
            label="Email"
            name="email"
            rules={[
              {
                required: true,
                message: 'กรุณาใส่อีเมลของคุณ!',
              },
            ]}
          >
            <Input />
          </Form.Item>

          {/* ช่องกรอกรหัสผ่าน */}
          <Form.Item
            label="Password"
            name="password"
            rules={[
              {
                required: true,
                message: 'กรุณาใส่รหัสผ่านของคุณ!',
              },
            ]}
          >
            <Input.Password />
          </Form.Item>

          {/* ตัวเลือก "จดจำการลงชื่อเข้าใช้" */}
          <Form.Item
            name="autoLogin"
            valuePropName="checked"
            wrapperCol={{ offset: 6, span: 18 }}
          >
            <Checkbox>เข้าสู่ระบบอัตโนมัติ</Checkbox>
          </Form.Item>

          {/* ปุ่มส่งฟอร์ม */}
          <Form.Item wrapperCol={{ offset: 2, span: 20 }}>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }}>
              เข้าสู่ระบบ
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}

export default Login;

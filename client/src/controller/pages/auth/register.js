import React from 'react';
import {  Button, Form, Input, } from 'antd';
import { registerHeadler } from '../../../functions/auth';

// ตัวอย่างข้อมูลจังหวัด ตำบล และหมู่บ้าน (สามารถเพิ่มข้อมูลได้ตามต้องการ)


const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};

const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};

const Register = () => {
  const [form] = Form.useForm();

  const onFinish = (values) => {
    registerHeadler(values).then((res)=>{

    }).catch((err)=>{
      console.log(err)
    })
    console.log('Received values of form: ', values);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div style={{ width: '400px', padding: '20px', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)', borderRadius: '8px' }}>
        <h2 style={{ textAlign: 'center' }}>REGISTER</h2>
        <Form
          {...layout}
          form={form}
          name="register"
          onFinish={onFinish}
          scrollToFirstError
        >
          <Form.Item
            name="email"
            label="อีเมล"
            rules={[
              {
                type: 'email',
                message: 'กรุณากรอกอีเมลให้ถูกต้อง!',
              },
              {
                required: true,
                message: 'กรุณากรอกอีเมล!',
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="password"
            label="รหัสผ่าน"
            rules={[
              {
                required: true,
                message: 'กรุณากรอกรหัสผ่าน!',
              },
            ]}
            hasFeedback
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="confirm"
            label="ยืนยันรหัสผ่าน"
            dependencies={['password']}
            hasFeedback
            rules={[
              {
                required: true,
                message: 'กรุณายืนยันรหัสผ่าน!',
              },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('รหัสผ่านไม่ตรงกัน!'));
                },
              }),
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="village"
            label="ชื่อหมูบ้าน"
            rules={[
              {
                required: true,
                message: 'กรุณากรอกชื่อหมูบ้าน!',
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="subdistrict"
            label="ตำบล"
            rules={[
              {
                required: true,
                message: 'กรุณากรอกตำบล!',
              },
            ]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="district"
            label="อำเภอ"
            rules={[
              {
                required: true,
                message: 'กรุณากรอกตำบล!',
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="province"
            label="จังหวัด"
            rules={[
              {
                required: true,
                message: 'กรุณากรอกจังหวัด!',
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item {...tailLayout}>
            <Button type="primary" htmlType="submit">
              ลงทะเบียน
            </Button>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
};

export default Register;

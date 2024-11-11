// src/components/ListTable.js
import React from 'react';
import { Space, Table, Tag, Button } from 'antd';
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import './styles/ListTable.css'; // สร้างไฟล์ CSS ใหม่สำหรับ ListTable

const { Column } = Table;

const data = [
  {
    key: '1',
    firstName: 'John',
    lastName: 'Doe',
    age: 32,
    address: 'New York No. 1 Lake Park',
    tags: ['Period', 'Member'],
  },
  {
    key: '2',
    firstName: 'Jane',
    lastName: 'Smith',
    age: 42,
    address: 'London No. 1 Lake Park',
    tags: ['Guest'],
  },
  // เพิ่มข้อมูลเพิ่มเติมตามต้องการ
];

const ListTable = () => (
  <Table className="list-table" dataSource={data} scroll={{ y: 150 }}>
    <Column title="LPR" dataIndex="firstName" key="firstName" />
    <Column title="Time" dataIndex="lastName" key="lastName" />
    <Column title="Address" dataIndex="address" key="address" />

    <Column
      title="Status"
      dataIndex="tags"
      key="tags"
      render={(tags) => (
        <>
          {tags.map((tag) => {
            let color = 'default';
            // Assign color based on tag value
            if (tag === 'Member') {
              color = 'green';
            } else if (tag === 'Guest') {
              color = 'geekblue';
            } else if (tag === 'Period') {
              color = 'yellow';
            } else if (tag === 'loser') {
              color = 'volcano';
            }

            return (
              <Tag color={color} key={tag} className="custom-tag">
                {tag.toUpperCase()}
              </Tag>
            );
          })}
        </>
      )}
    />

    <Column
      title="Action"
      key="action"
      width={90}
      render={(_, record) => (
        <Space size="middle">
          <Button
            type="primary"
            shape="circle"
            icon={<EditOutlined />}
            size="small"
            className="action-button edit-button"
            onClick={() => {
              // Add your edit functionality here
            }}
          />
          <Button
            type="primary"
            shape="circle"
            icon={<DeleteOutlined />}
            size="small"
            className="action-button delete-button"
            onClick={() => {
              // Add your delete functionality here
            }}
          />
        </Space>
      )}
    />
  </Table>
);

export default ListTable;

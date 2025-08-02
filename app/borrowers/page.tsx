/** @format */

'use client';

import { useState, useEffect } from 'react';
import {
  Layout,
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Tag,
  Card,
  Typography,
  Spin,
  Badge,
  Empty,
  Tooltip,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  IdcardOutlined,
  SearchOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Borrower } from '@/lib/models';
import { PERMISSIONS } from '@/lib/auth';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;

type BorrowerRole = 'Intern' | 'Lawyer' | 'Staff' | 'Partner' | 'Associate';
export const dynamic = 'force-dynamic';
export default function BorrowersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const borrowerRoles: BorrowerRole[] = [
    'Intern',
    'Lawyer',
    'Staff',
    'Partner',
    'Associate',
  ];
  const roleColors: Record<BorrowerRole, string> = {
    Intern: 'blue',
    Lawyer: 'geekblue',
    Staff: 'cyan',
    Partner: 'purple',
    Associate: 'magenta',
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchBorrowers();
    }
  }, [status, router, pagination.current, pagination.pageSize, searchQuery]);

  const fetchBorrowers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
        search: searchQuery,
      });
      const response = await fetch(`/api/borrowers?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch borrowers');

      const data = await response.json();
      setBorrowers(
        data.borrowers.map((b: Borrower) => ({ ...b, _id: b._id?.toString() }))
      );
      setPagination((prev) => ({ ...prev, total: data.total }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch borrowers'
      );
      message.error('Failed to load borrowers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBorrower = () => {
    setEditingBorrower(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditBorrower = (borrower: Borrower) => {
    setEditingBorrower(borrower);
    form.setFieldsValue(borrower);
    setModalVisible(true);
  };

  const handleDeleteBorrower = async (id: string) => {
    try {
      const response = await fetch(`/api/borrowers/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete borrower');

      setBorrowers((prev) => prev.filter((b) => b._id !== id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      message.success('Borrower deleted successfully');
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Failed to delete borrower'
      );
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      let response;

      if (editingBorrower) {
        response = await fetch(`/api/borrowers/${editingBorrower._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
      } else {
        response = await fetch('/api/borrowers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(values),
        });
      }

      if (response.ok) {
        message.success(
          editingBorrower
            ? 'Borrower updated successfully!'
            : 'Borrower added successfully!'
        );
        setModalVisible(false);
        fetchBorrowers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Operation failed');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
  };

  const columns: ColumnsType<Borrower> = [
    {
      title: 'Database ID',
      dataIndex: '_id',
      key: '_id',
      render: (_id: string) => (
        <div className='flex items-center gap-1'>
          <Tag color='geekblue' className='font-mono truncate max-w-[120px]'>
            {_id}
          </Tag>
          <Tooltip title='Copy ID'>
            <Button
              type='text'
              icon={<CopyOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(_id);
              }}
              size='small'
            />
          </Tooltip>
        </div>
      ),
      fixed: 'left',
      width: 200,
    },
    {
      title: 'Member ID',
      dataIndex: 'memberId',
      key: 'memberId',
      sorter: (a, b) => a.memberId.localeCompare(b.memberId),
      render: (memberId: string) => (
        <Tag color='blue' className='font-mono'>
          {memberId}
        </Tag>
      ),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: BorrowerRole) => (
        <Tag color={roleColors[role]} className='capitalize'>
          {role}
        </Tag>
      ),
      sorter: (a, b) => a.role.localeCompare(b.role),
      filters: borrowerRoles.map((role) => ({
        text: role,
        value: role,
      })),
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string) => (
        <div className='flex items-center gap-1'>
          <span>{phone}</span>
          <Tooltip title='Call'>
            <a href={`tel:${phone}`}>
              <PhoneOutlined className='text-blue-500' />
            </a>
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <div className='flex items-center gap-1'>
          <a href={`mailto:${email}`} className='text-blue-500'>
            {email}
          </a>
          <Tooltip title='Copy email'>
            <Button
              type='text'
              icon={<CopyOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(email);
              }}
              size='small'
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_: any, record: Borrower) => (
        <Space size='middle'>
          {session?.user?.permissions?.includes(
            PERMISSIONS.BORROWERS_UPDATE
          ) && (
            <Tooltip title='Edit'>
              <Button
                type='text'
                icon={<EditOutlined />}
                onClick={() => handleEditBorrower(record)}
                className='text-blue-500 hover:text-blue-700'
              />
            </Tooltip>
          )}
          {session?.user?.permissions?.includes(
            PERMISSIONS.BORROWERS_DELETE
          ) && (
            <Tooltip title='Delete'>
              <Popconfirm
                title={`Delete borrower ${record.name}?`}
                description={`This will permanently delete ${record.name} (ID: ${record._id})`}
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDeleteBorrower(record._id!);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText='Yes'
                cancelText='No'
                placement='left'
              >
                <Button
                  type='text'
                  icon={<DeleteOutlined />}
                  className='text-red-500 hover:text-red-700'
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  if (status === 'loading') {
    return (
      <div className='min-h-screen flex justify-center items-center'>
        <Spin size='large' tip='Loading...' />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const canReadBorrowers =
    session?.user?.permissions?.includes(PERMISSIONS.BORROWERS_READ) || false;
  const canCreateBorrowers =
    session?.user?.permissions?.includes(PERMISSIONS.BORROWERS_CREATE) || false;

  if (!canReadBorrowers) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='Borrower Management' />
          <Content className='p-4 md:p-6'>
            <Card className='rounded-lg shadow-sm border-0'>
              <Empty
                image={<UserOutlined className='text-5xl text-gray-300' />}
                description={
                  <div className='space-y-2'>
                    <Title level={4} className='text-gray-600 m-0'>
                      Access Restricted
                    </Title>
                    <Text type='secondary'>
                      You don't have permission to view borrower information
                    </Text>
                  </div>
                }
              />
            </Card>
          </Content>
        </Layout>
      </Layout>
    );
  }

  return (
    <Layout className='min-h-screen bg-gray-50'>
      <Sidebar />
      <Layout className='ml-0 lg:ml-[250px] transition-all'>
        <Header title='Borrower Management' />
        <Content className='p-4 md:p-6'>
          <Card
            className='rounded-lg shadow-sm border-0'
            bodyStyle={{ padding: 0 }}
          >
            <div className='p-4 border-b border-gray-200'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                <div className='flex items-center gap-2'>
                  <UserOutlined className='text-blue-500 text-xl' />
                  <Title level={4} className='m-0'>
                    Borrowers
                  </Title>
                </div>
                <div className='flex flex-col sm:flex-row gap-3'>
                  <Input
                    placeholder='Search by name, email, or ID...'
                    prefix={<SearchOutlined />}
                    allowClear
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='w-full sm:w-64'
                  />
                  {canCreateBorrowers && (
                    <Button
                      type='primary'
                      icon={<PlusOutlined />}
                      onClick={handleAddBorrower}
                      className='w-full sm:w-auto'
                    >
                      Add Borrower
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {error ? (
              <Alert
                message='Error Loading Borrowers'
                description={error}
                type='error'
                showIcon
                className='m-4'
              />
            ) : loading ? (
              <div className='text-center py-8'>
                <Spin size='large' tip='Loading borrowers...' />
              </div>
            ) : borrowers.length === 0 ? (
              <Empty
                description={
                  <div className='space-y-2'>
                    <Text strong>No borrowers found</Text>
                    <Text type='secondary'>
                      {searchQuery
                        ? 'Try a different search term'
                        : 'Add a new borrower to get started'}
                    </Text>
                  </div>
                }
                className='py-8'
              >
                {canCreateBorrowers && (
                  <Button
                    type='primary'
                    icon={<PlusOutlined />}
                    onClick={handleAddBorrower}
                  >
                    Add Borrower
                  </Button>
                )}
              </Empty>
            ) : (
              <Table
                columns={columns}
                dataSource={borrowers}
                loading={loading}
                rowKey='_id'
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} borrowers`,
                  onChange: (page, pageSize) => {
                    setPagination({
                      current: page.current || 1,
                      pageSize: page.pageSize || 10,
                      total: pagination.total,
                    });
                  },
                }}
                scroll={{ x: 'max-content' }}
                className='w-full'
                onRow={(record) => ({
                  onClick: () => handleEditBorrower(record),
                  style: { cursor: 'pointer' },
                })}
              />
            )}
          </Card>

          <Modal
            title={
              <div className='flex items-center gap-2'>
                <UserOutlined className='text-blue-500' />
                {editingBorrower
                  ? `Edit Borrower (ID: ${editingBorrower._id})`
                  : 'Add New Borrower'}
              </div>
            }
            open={modalVisible}
            onOk={handleModalOk}
            onCancel={() => setModalVisible(false)}
            confirmLoading={loading}
            width={600}
            destroyOnClose
          >
            <Form form={form} layout='vertical' className='mt-4'>
              {editingBorrower && (
                <Form.Item label='Database ID'>
                  <div className='flex items-center gap-2'>
                    <Input value={editingBorrower._id} disabled />
                    <Tooltip title='Copy ID'>
                      <Button
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(editingBorrower._id!)}
                      />
                    </Tooltip>
                  </div>
                </Form.Item>
              )}
              <Form.Item
                name='memberId'
                label='Member ID'
                rules={[
                  { required: true, message: 'Please input the member ID!' },
                  {
                    pattern: /^[A-Za-z0-9-]+$/,
                    message: 'Only letters, numbers and hyphens allowed',
                  },
                ]}
              >
                <Input
                  prefix={<IdcardOutlined />}
                  disabled={!!editingBorrower}
                  placeholder='e.g., MEM-001'
                />
              </Form.Item>
              <Form.Item
                name='name'
                label='Full Name'
                rules={[
                  {
                    required: true,
                    message: "Please input the borrower's name!",
                  },
                  { min: 2, message: 'Name must be at least 2 characters' },
                ]}
              >
                <Input prefix={<UserOutlined />} placeholder='John Doe' />
              </Form.Item>
              <Form.Item
                name='role'
                label='Role'
                rules={[{ required: true, message: 'Please select a role!' }]}
              >
                <Select placeholder='Select borrower role'>
                  {borrowerRoles.map((role) => (
                    <Option key={role} value={role}>
                      {role}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name='phone'
                label='Phone Number'
                rules={[
                  { required: true, message: 'Please input the phone number!' },
                  {
                    pattern: /^[+0-9\s-]+$/,
                    message: 'Invalid phone number format',
                  },
                ]}
              >
                <Input prefix={<PhoneOutlined />} placeholder='+1234567890' />
              </Form.Item>
              <Form.Item
                name='email'
                label='Email'
                rules={[
                  { required: true, message: 'Please input the email!' },
                  { type: 'email', message: 'Invalid email format!' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder='user@example.com'
                />
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}

/** @format */

'use client';

import { useState, useEffect } from 'react';
import {
  Layout,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Typography,
  Space,
  message,
  Popconfirm,
  Select,
  Card,
  Spin,
  Alert,
  Tag,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  LockOutlined,
  MailOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/models';
import {
  PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
  ADMIN_PERMISSIONS,
  DEFAULT_USER_PERMISSIONS,
} from '@/lib/auth';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;
export const dynamic = 'force-dynamic';
export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const userRoles = ['User', 'Librarian', 'Admin', 'Super Admin'];
  const roleColors: Record<string, string> = {
    'Super Admin': 'red',
    Admin: 'orange',
    Librarian: 'blue',
    User: 'green',
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchUsers();
    }
  }, [status, router, pagination.current, pagination.pageSize, searchQuery]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
        search: searchQuery,
      });
      const response = await fetch(`/api/users?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users.map((u: User) => ({ ...u, _id: u._id?.toString() })));
      setPagination((prev) => ({ ...prev, total: data.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      message.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      ...user,
      password: '',
    });
    setIsModalVisible(true);
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete user');
      message.success('User deleted successfully!');
      fetchUsers();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Failed to delete user'
      );
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      let response;

      // Determine permissions based on selected role
      let assignedPermissions: string[] = [];
      switch (values.role) {
        case 'Super Admin':
          assignedPermissions = SUPER_ADMIN_PERMISSIONS;
          break;
        case 'Admin':
          assignedPermissions = ADMIN_PERMISSIONS;
          break;
        case 'Librarian':
          assignedPermissions = [
            ...DEFAULT_USER_PERMISSIONS,
            PERMISSIONS.BOOKS_CREATE,
            PERMISSIONS.BOOKS_UPDATE,
            PERMISSIONS.BOOKS_DELETE,
            PERMISSIONS.BORROWERS_CREATE,
            PERMISSIONS.BORROWERS_UPDATE,
            PERMISSIONS.BORROWERS_DELETE,
            PERMISSIONS.LENDINGS_CREATE,
            PERMISSIONS.LENDINGS_UPDATE,
            PERMISSIONS.NOTIFICATIONS_CREATE,
            PERMISSIONS.NOTIFICATIONS_UPDATE,
          ];
          break;
        case 'User':
        default:
          assignedPermissions = DEFAULT_USER_PERMISSIONS;
          break;
      }

      const payload = { ...values, permissions: assignedPermissions };

      if (editingUser) {
        response = await fetch(`/api/users/${editingUser._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        response = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (response.ok) {
        message.success(
          editingUser
            ? 'User updated successfully!'
            : 'User added successfully!'
        );
        setIsModalVisible(false);
        fetchUsers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Operation failed');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const columns: ColumnsType<User> = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      sorter: (a, b) => (a.email || '').localeCompare(b.email || ''),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      sorter: (a, b) => a.role.localeCompare(b.role),
      render: (role) => <Tag color={roleColors[role] || 'default'}>{role}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 150,
      render: (_, record) => (
        <Space size='middle'>
          {session?.user?.permissions?.includes(PERMISSIONS.USERS_UPDATE) && (
            <Button
              type='text'
              icon={<EditOutlined />}
              onClick={() => handleEditUser(record)}
              className='text-blue-500 hover:text-blue-700'
            />
          )}
          {session?.user?.permissions?.includes(PERMISSIONS.USERS_DELETE) &&
            session?.user?.id !== record._id && (
              <Popconfirm
                title='Are you sure to delete this user?'
                onConfirm={() => handleDeleteUser(record._id!.toString())}
                okText='Yes'
                cancelText='No'
                placement='left'
              >
                <Button
                  type='text'
                  icon={<DeleteOutlined />}
                  className='text-red-500 hover:text-red-700'
                />
              </Popconfirm>
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

  const canReadUsers =
    session?.user?.permissions?.includes(PERMISSIONS.USERS_READ) || false;
  const canCreateUsers =
    session?.user?.permissions?.includes(PERMISSIONS.USERS_CREATE) || false;

  if (!canReadUsers) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='User Management' />
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
                      You don't have permission to view user information
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
        <Header title='User Management' />
        <Content className='p-4 md:p-6'>
          <Card
            className='rounded-lg shadow-sm border-0'
            bodyStyle={{ padding: 0 }}
          >
            <div className='p-4 border-b border-gray-200'>
              <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
                <div className='flex items-center gap-2'>
                  <UserOutlined className='text-blue-500 text-xl' />
                  <Title level={4} className='m-0'>
                    Users
                  </Title>
                </div>
                <div className='flex flex-col sm:flex-row gap-3'>
                  <Input
                    placeholder='Search users...'
                    prefix={<SearchOutlined />}
                    allowClear
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='w-full sm:w-64'
                  />
                  {canCreateUsers && (
                    <Button
                      type='primary'
                      icon={<PlusOutlined />}
                      onClick={handleAddUser}
                      className='w-full sm:w-auto'
                    >
                      Add User
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {error ? (
              <Alert
                message='Error'
                description={error}
                type='error'
                showIcon
                className='m-4'
              />
            ) : (
              <Table
                columns={columns}
                dataSource={users}
                loading={loading}
                rowKey='_id'
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} users`,
                  onChange: (page, pageSize) => {
                    setPagination((prev) => ({
                      ...prev,
                      current: page,
                      pageSize: pageSize || 10,
                    }));
                  },
                }}
                scroll={{ x: true }}
                className='w-full'
              />
            )}
          </Card>

          <Modal
            title={
              <div className='flex items-center gap-2'>
                <UserOutlined className='text-blue-500' />
                {editingUser ? 'Edit User' : 'Add New User'}
              </div>
            }
            open={isModalVisible}
            onOk={handleModalOk}
            onCancel={() => setIsModalVisible(false)}
            confirmLoading={loading}
            width={600}
            destroyOnClose
          >
            <Form form={form} layout='vertical' className='mt-4'>
              <Form.Item
                name='name'
                label='Full Name'
                rules={[
                  { required: true, message: "Please input the user's name!" },
                ]}
              >
                <Input prefix={<UserOutlined />} placeholder='John Doe' />
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
                  disabled={!!editingUser}
                />
              </Form.Item>
              <Form.Item
                name='password'
                label='Password'
                rules={
                  editingUser
                    ? []
                    : [
                        {
                          required: true,
                          message: 'Please input the password!',
                        },
                        {
                          min: 6,
                          message: 'Password must be at least 6 characters!',
                        },
                      ]
                }
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder={
                    editingUser
                      ? 'Leave blank to keep current password'
                      : 'At least 6 characters'
                  }
                />
              </Form.Item>
              <Form.Item
                name='role'
                label='Role'
                rules={[{ required: true, message: 'Please select a role!' }]}
              >
                <Select placeholder='Select user role'>
                  {userRoles.map((role) => (
                    <Option key={role} value={role}>
                      {role}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}

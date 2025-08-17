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
  Tag,
  Select,
  Card,
  Spin,
  Badge,
  Empty,
  Tooltip,
  Alert,
  Divider,
  Switch,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  SearchOutlined,
  MailOutlined,
  LockOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/auth';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

type UserRole = 'Super Admin' | 'Admin' | 'Librarian' | 'User';

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isInviteModalVisible, setIsInviteModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [form] = Form.useForm();
  const [inviteForm] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const roleColors: Record<UserRole, string> = {
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
      setUsers(data.users);
      setPagination((prev) => ({ ...prev, total: data.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
      message.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleInviteUser = () => {
    inviteForm.resetFields();
    setIsInviteModalVisible(true);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    form.setFieldsValue({
      ...user,
      active: user.status === 'active',
    });
    setIsModalVisible(true);
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }
      setUsers((prev) => prev.filter((u) => u._id !== id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      message.success('User deleted successfully!');
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Failed to delete user'
      );
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        status: values.active ? 'active' : 'inactive',
      };

      delete payload.active; // Remove the UI-only field

      const response = editingUser
        ? await fetch(`/api/users/${editingUser._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

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

  const handleInviteModalOk = async () => {
    try {
      const values = await inviteForm.validateFields();

      const response = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('Invitation sent successfully!');
        setIsInviteModalVisible(false);
        fetchUsers();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send invitation');
      }
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Failed to send invitation'
      );
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
  };

  const resetUserPassword = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        message.success('Password reset link sent to user');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Failed to reset password'
      );
    }
  };

  const columns = [
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
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string) => (
        <div className='flex items-center gap-2'>
          <MailOutlined />
          <Text>{email}</Text>
        </div>
      ),
      sorter: (a, b) => a.email.localeCompare(b.email),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text>{text || '-'}</Text>,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || ''),
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => (
        <Tag color={roleColors[role]} className='capitalize'>
          {role}
        </Tag>
      ),
      sorter: (a, b) => a.role.localeCompare(b.role),
      filters: Object.keys(roleColors).map((role) => ({
        text: role,
        value: role,
      })),
      onFilter: (value, record) => record.role === value,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (
        status: string = 'inactive' // Add default value here
      ) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status.toUpperCase()}
        </Tag>
      ),
      sorter: (a, b) =>
        (a.status || 'inactive').localeCompare(b.status || 'inactive'),
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
      ],
      onFilter: (value, record) => (record.status || 'inactive') === value,
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (_: any, record: any) => (
        <Space size='middle'>
          {session?.user?.permissions?.includes(PERMISSIONS.USERS_UPDATE) && (
            <Tooltip title='Edit'>
              <Button
                type='text'
                icon={<EditOutlined />}
                onClick={() => handleEditUser(record)}
                className='text-blue-500 hover:text-blue-700'
              />
            </Tooltip>
          )}
          {session?.user?.permissions?.includes(PERMISSIONS.USERS_UPDATE) && (
            <Tooltip title='Reset Password'>
              <Button
                type='text'
                icon={<LockOutlined />}
                onClick={() => resetUserPassword(record._id)}
                className='text-orange-500 hover:text-orange-700'
              />
            </Tooltip>
          )}
          {session?.user?.permissions?.includes(PERMISSIONS.USERS_DELETE) && (
            <Tooltip title='Delete'>
              <Popconfirm
                title={`Delete user ${record.email}?`}
                description={`This will permanently delete ${record.email} (ID: ${record._id})`}
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDeleteUser(record._id);
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
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
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
                    <Space>
                      <Button
                        type='primary'
                        icon={<PlusOutlined />}
                        onClick={handleAddUser}
                        className='w-full sm:w-auto'
                      >
                        Add User
                      </Button>
                      <Button
                        type='default'
                        icon={<MailOutlined />}
                        onClick={handleInviteUser}
                        className='w-full sm:w-auto'
                      >
                        Invite User
                      </Button>
                    </Space>
                  )}
                </div>
              </div>
            </div>

            {error ? (
              <Alert
                message='Error Loading Users'
                description={error}
                type='error'
                showIcon
                className='m-4'
              />
            ) : loading ? (
              <div className='text-center py-8'>
                <Spin size='large' tip='Loading users...' />
              </div>
            ) : users.length === 0 ? (
              <Empty
                description={
                  <div className='space-y-2'>
                    <Text strong>No users found</Text>
                    <Text type='secondary'>
                      {searchQuery
                        ? 'Try a different search term'
                        : 'Add a new user to get started'}
                    </Text>
                  </div>
                }
                className='py-8'
              >
                {canCreateUsers && (
                  <Space>
                    <Button
                      type='primary'
                      icon={<PlusOutlined />}
                      onClick={handleAddUser}
                    >
                      Add User
                    </Button>
                    <Button
                      type='default'
                      icon={<MailOutlined />}
                      onClick={handleInviteUser}
                    >
                      Invite User
                    </Button>
                  </Space>
                )}
              </Empty>
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
                    setPagination({
                      current: page.current || 1,
                      pageSize: page.pageSize || 10,
                      total: pagination.total,
                    });
                  },
                }}
                scroll={{ x: 'max-content' }}
                className='w-full'
              />
            )}
          </Card>

          {/* User Add/Edit Modal */}
          <Modal
            title={
              <div className='flex items-center gap-2'>
                <UserOutlined className='text-blue-500' />
                {editingUser
                  ? `Edit User (${editingUser.email})`
                  : 'Add New User'}
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
              {editingUser && (
                <Form.Item label='Database ID'>
                  <div className='flex items-center gap-2'>
                    <Input value={editingUser._id} disabled />
                    <Tooltip title='Copy ID'>
                      <Button
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(editingUser._id)}
                      />
                    </Tooltip>
                  </div>
                </Form.Item>
              )}
              <Form.Item
                name='email'
                label='Email'
                rules={[
                  { required: true, message: 'Please input the email!' },
                  { type: 'email', message: 'Please enter a valid email!' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder='user@example.com'
                  disabled={!!editingUser}
                />
              </Form.Item>
              <Form.Item
                name='name'
                label='Full Name'
                rules={[
                  { required: true, message: 'Please input the full name!' },
                ]}
              >
                <Input prefix={<UserOutlined />} placeholder='John Doe' />
              </Form.Item>
              <Form.Item
                name='role'
                label='Role'
                rules={[{ required: true, message: 'Please select a role!' }]}
              >
                <Select placeholder='Select a role'>
                  {Object.keys(ROLE_PERMISSIONS).map((role) => (
                    <Option key={role} value={role}>
                      {role}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              {!editingUser && (
                <Form.Item
                  name='password'
                  label='Password'
                  rules={[
                    { required: true, message: 'Please input the password!' },
                    {
                      min: 8,
                      message: 'Password must be at least 8 characters',
                    },
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined />}
                    placeholder='Password'
                  />
                </Form.Item>
              )}
              <Form.Item
                name='active'
                label='Status'
                valuePropName='checked'
                initialValue={true}
              >
                <Switch
                  checkedChildren='Active'
                  unCheckedChildren='Inactive'
                  defaultChecked
                />
              </Form.Item>
            </Form>
          </Modal>

          {/* Invite User Modal */}
          <Modal
            title={
              <div className='flex items-center gap-2'>
                <MailOutlined className='text-blue-500' />
                Invite New User
              </div>
            }
            open={isInviteModalVisible}
            onOk={handleInviteModalOk}
            onCancel={() => setIsInviteModalVisible(false)}
            confirmLoading={loading}
            width={600}
            destroyOnClose
          >
            <Form form={inviteForm} layout='vertical' className='mt-4'>
              <Form.Item
                name='email'
                label='Email'
                rules={[
                  { required: true, message: 'Please input the email!' },
                  { type: 'email', message: 'Please enter a valid email!' },
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder='user@example.com'
                />
              </Form.Item>
              <Form.Item
                name='role'
                label='Role'
                rules={[{ required: true, message: 'Please select a role!' }]}
              >
                <Select placeholder='Select a role'>
                  {Object.keys(ROLE_PERMISSIONS).map((role) => (
                    <Option key={role} value={role}>
                      {role}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Alert
                message='Invitation Details'
                description='An invitation email will be sent to the user with a link to complete their registration.'
                type='info'
                showIcon
              />
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}

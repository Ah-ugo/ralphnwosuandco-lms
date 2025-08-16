/** @format */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
  Row,
  Col,
  Typography,
  Spin,
  Card,
  Empty,
} from 'antd';
import {
  FolderOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import type { Case, User } from '@/lib/models';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { PERMISSIONS } from '@/lib/auth';

const { Content } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;

type CaseStatus = 'Open' | 'Closed' | 'Pending' | 'Archived';

export default function CasesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [users, setUsers] = useState<User[]>([]); // For assignedTo dropdown
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [form] = Form.useForm();

  const caseStatuses: CaseStatus[] = ['Open', 'Closed', 'Pending', 'Archived'];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchCases();
      fetchUsers();
    }
  }, [
    status,
    router,
    statusFilter,
    searchQuery,
    pagination.current,
    pagination.pageSize,
  ]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchQuery && { search: searchQuery }),
      });
      const response = await fetch(`/api/cases?${params}`);
      const data = await response.json();
      if (response.ok) {
        setCases(data.cases);
        setPagination((prev) => ({
          ...prev,
          total: data.total,
        }));
      } else {
        message.error(data.error || 'Failed to fetch cases');
      }
    } catch (error) {
      message.error('Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users'); // Assuming this endpoint returns all users
      const data = await response.json();
      if (response.ok) {
        setUsers(
          data.users.map((u: User) => ({ ...u, _id: u._id?.toString() }))
        );
      } else {
        message.error(data.error || 'Failed to fetch users');
      }
    } catch (error) {
      message.error('Failed to fetch users');
    }
  };

  const handleAddCase = () => {
    setIsEditing(false);
    setCurrentCase(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEditCase = (record: Case) => {
    setIsEditing(true);
    setCurrentCase(record);
    form.setFieldsValue({
      ...record,
      assignedTo: record.assignedTo?.toString(), // Ensure assignedTo is string for form
    });
    setModalVisible(true);
  };

  const handleDeleteCase = async (id: string) => {
    try {
      const response = await fetch(`/api/cases/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        message.success('Case deleted successfully!');
        fetchCases();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete case');
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to delete case'
      );
    }
  };

  const handleFormSubmit = async (values: any) => {
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `/api/cases/${currentCase?._id}` : '/api/cases';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success(
          `Case ${isEditing ? 'updated' : 'created'} successfully!`
        );
        setModalVisible(false);
        form.resetFields();
        fetchCases();
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to ${isEditing ? 'update' : 'create'} case`
        );
      }
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? 'update' : 'create'} case`
      );
    }
  };

  const getStatusTag = (status: string) => {
    let color = 'blue';
    switch (status) {
      case 'Open':
        color = 'green';
        break;
      case 'Closed':
        color = 'red';
        break;
      case 'Pending':
        color = 'orange';
        break;
      case 'Archived':
        color = 'default';
        break;
      default:
        color = 'blue';
    }
    return <Tag color={color}>{status}</Tag>;
  };

  const columns: ColumnsType<Case> = [
    {
      title: 'Case ID',
      dataIndex: 'caseId',
      key: 'caseId',
      render: (text: string, record: Case) => (
        <Button type='link' onClick={() => router.push(`/cases/${record._id}`)}>
          <Text strong>{text}</Text>
        </Button>
      ),
      sorter: (a, b) => a.caseId.localeCompare(b.caseId),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a, b) => a.title.localeCompare(b.title),
    },
    {
      title: 'Client Name',
      dataIndex: 'clientName',
      key: 'clientName',
      sorter: (a, b) => a.clientName.localeCompare(b.clientName),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
      filters: caseStatuses.map((status) => ({
        text: status,
        value: status,
      })),
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Assigned To',
      dataIndex: ['assignedUser', 'name'],
      key: 'assignedTo',
      render: (name: string | undefined) => name || 'Unassigned',
      sorter: (a, b) =>
        (a.assignedUser?.name || '').localeCompare(b.assignedUser?.name || ''),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (record: Case) => (
        <Space size='middle'>
          {canUpdateCases && (
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEditCase(record)}
              aria-label={`Edit ${record.title}`}
            />
          )}
          {canDeleteCases && (
            <Popconfirm
              title='Confirm Delete'
              description='Are you sure you want to delete this case? All associated documents must be deleted first.'
              onConfirm={() => handleDeleteCase(record._id as string)}
              okText='Yes'
              cancelText='No'
              placement='left'
            >
              <Button
                icon={<DeleteOutlined />}
                danger
                aria-label={`Delete ${record.title}`}
              />
            </Popconfirm>
          )}
          <Button
            icon={<EyeOutlined />}
            onClick={() => router.push(`/cases/${record._id}`)}
            aria-label={`View ${record.title}`}
          />
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

  const canReadCases =
    session?.user?.permissions?.includes(PERMISSIONS.CASES_READ) || false;
  const canCreateCases =
    session?.user?.permissions?.includes(PERMISSIONS.CASES_CREATE) || false;
  const canUpdateCases =
    session?.user?.permissions?.includes(PERMISSIONS.CASES_UPDATE) || false;
  const canDeleteCases =
    session?.user?.permissions?.includes(PERMISSIONS.CASES_DELETE) || false;

  if (!canReadCases) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='Case Management' />
          <Content className='p-4 md:p-6'>
            <Card className='rounded-lg shadow-sm border-0'>
              <Empty
                image={<FolderOutlined className='text-5xl text-gray-300' />}
                description={
                  <div className='space-y-2'>
                    <Title level={4} className='text-gray-600 m-0'>
                      Access Restricted
                    </Title>
                    <Text type='secondary'>
                      You don't have permission to view case records
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
        <Header title='Case Management' />
        <Content className='p-4 md:p-6'>
          <Card
            className='rounded-lg shadow-sm border-0'
            title={
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                <div className='flex items-center gap-2'>
                  <FolderOutlined className='text-blue-500 text-xl' />
                  <Title level={4} className='m-0'>
                    Case Records
                  </Title>
                </div>
                <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
                  <Input
                    placeholder='Search cases...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='w-full sm:w-48'
                  />
                  <Select
                    defaultValue='all'
                    className='w-full sm:w-48'
                    onChange={(value) => setStatusFilter(value)}
                  >
                    <Option value='all'>All Statuses</Option>
                    {caseStatuses.map((status) => (
                      <Option key={status} value={status}>
                        {status}
                      </Option>
                    ))}
                  </Select>
                  {canCreateCases && (
                    <Button
                      type='primary'
                      icon={<PlusOutlined />}
                      onClick={handleAddCase}
                      className='w-full sm:w-auto'
                    >
                      New Case
                    </Button>
                  )}
                </div>
              </div>
            }
          >
            <Table
              columns={columns}
              dataSource={cases}
              loading={loading}
              rowKey='_id'
              pagination={{
                ...pagination,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} records`,
                onChange: (page, pageSize) => {
                  setPagination({
                    current: page,
                    pageSize: pageSize,
                    total: pagination.total,
                  });
                },
              }}
              scroll={{ x: 'max-content' }}
              className='w-full'
            />
          </Card>

          <Modal
            title={
              <div className='flex items-center gap-2'>
                <FolderOutlined className='text-blue-500' />
                {isEditing ? 'Edit Case' : 'New Case'}
              </div>
            }
            open={modalVisible}
            onCancel={() => {
              setModalVisible(false);
              form.resetFields();
            }}
            footer={null}
            destroyOnClose
          >
            <Form form={form} layout='vertical' onFinish={handleFormSubmit}>
              <Form.Item
                name='caseId'
                label='Case ID'
                rules={[{ required: true, message: 'Please enter a Case ID' }]}
              >
                <Input placeholder='e.g., RNCL-2023-001' disabled={isEditing} />
              </Form.Item>
              <Form.Item
                name='title'
                label='Title'
                rules={[{ required: true, message: 'Please enter a title' }]}
              >
                <Input placeholder='e.g., Contract Dispute with Acme Corp.' />
              </Form.Item>
              <Form.Item name='description' label='Description'>
                <TextArea
                  rows={3}
                  placeholder='Detailed description of the case'
                />
              </Form.Item>
              <Form.Item
                name='clientName'
                label='Client Name'
                rules={[
                  { required: true, message: 'Please enter client name' },
                ]}
              >
                <Input placeholder='e.g., Acme Corp.' />
              </Form.Item>
              <Form.Item
                name='status'
                label='Status'
                rules={[{ required: true, message: 'Please select a status' }]}
              >
                <Select placeholder='Select status'>
                  {caseStatuses.map((status) => (
                    <Option key={status} value={status}>
                      {status}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name='assignedTo' label='Assigned To'>
                <Select
                  placeholder='Select assigned user (optional)'
                  allowClear
                  showSearch
                  optionFilterProp='children'
                  filterOption={(input, option) =>
                    (option?.children as string)
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {users.map((user) => (
                    <Option key={user._id} value={user._id}>
                      {user.name} ({user.role})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item>
                <Button type='primary' htmlType='submit' className='w-full'>
                  {isEditing ? 'Update Case' : 'Create Case'}
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}

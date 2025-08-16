/** @format */

'use client';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
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
  DatePicker,
  Spin,
  Card,
  Badge,
  Empty,
} from 'antd';
import {
  SwapOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  MailOutlined,
} from '@ant-design/icons';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import type { LendingRecord, Book, Borrower } from '@/lib/models';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { PERMISSIONS } from '@/lib/auth';

const { Content } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;

type LendingStatus = 'borrowed' | 'returned' | 'overdue';

export default function LendingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lendings, setLendings] = useState<LendingRecord[]>([]);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [borrowersList, setBorrowersList] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [returnModalVisible, setReturnModalVisible] = useState(false);
  const [selectedLendingId, setSelectedLendingId] = useState<string | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [form] = Form.useForm();

  const lendingStatuses: LendingStatus[] = ['borrowed', 'returned', 'overdue'];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchLendings();
      fetchAvailableBooks();
      fetchBorrowersList();
    }
  }, [status, router, statusFilter, pagination.current, pagination.pageSize]);

  const fetchLendings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
        ...(statusFilter !== 'all' && { status: statusFilter }),
      });

      const response = await fetch(`/api/lendings?${params}`);
      const data = await response.json();

      if (response.ok) {
        const formattedLendings = data.lendings.map((l: LendingRecord) => ({
          ...l,
          _id: l._id?.toString(),
          bookId: l.bookId?.toString(),
          borrowerId: l.borrowerId?.toString(),
          book: l.book ? { ...l.book, _id: l.book._id?.toString() } : undefined,
          borrower: l.borrower
            ? { ...l.borrower, _id: l.borrower._id?.toString() }
            : undefined,
        }));
        setLendings(formattedLendings);
        setPagination((prev) => ({
          ...prev,
          total: data.total,
        }));
      } else {
        message.error(data.error || 'Failed to fetch lendings');
      }
    } catch (error) {
      message.error('Failed to fetch lendings');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBooks = async () => {
    try {
      const response = await fetch('/api/books/available');
      const data = await response.json();
      if (response.ok) {
        setAvailableBooks(
          data.map((b: Book) => ({ ...b, _id: b._id?.toString() }))
        );
      } else {
        message.error(data.error || 'Failed to fetch available books');
      }
    } catch (error) {
      message.error('Failed to fetch available books');
    }
  };

  const fetchBorrowersList = async () => {
    try {
      const response = await fetch('/api/borrowers/list');
      const data = await response.json();
      if (response.ok) {
        setBorrowersList(
          data.map((b: Borrower) => ({ ...b, _id: b._id?.toString() }))
        );
      } else {
        message.error(data.error || 'Failed to fetch borrowers');
      }
    } catch (error) {
      message.error('Failed to fetch borrowers');
    }
  };

  const handleNotifyOverdue = async () => {
    setNotifying(true);
    try {
      const response = await fetch('/api/lendings/notify-overdue', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.notifiedCount > 0) {
          message.success(
            `Sent overdue notifications to ${result.notifiedCount} borrowers (${result.totalOverdue} total overdue)`
          );
        } else if (result.totalOverdue > 0) {
          message.warning(
            `Found ${result.totalOverdue} overdue books but couldn't send notifications (missing emails?)`
          );
        } else {
          message.info('No overdue books found');
        }
        fetchLendings(); // Refresh the list to update statuses
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send notifications');
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to send notifications'
      );
    } finally {
      setNotifying(false);
    }
  };

  const handleBorrowSubmit = async (values: any) => {
    try {
      const response = await fetch('/api/lendings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: values.bookId,
          borrowerId: values.borrowerId,
          dueDate: values.dueDate.toISOString(),
          notes: values.notes,
        }),
      });

      if (response.ok) {
        message.success('Book borrowed successfully!');
        setModalVisible(false);
        form.resetFields();
        fetchLendings();
        fetchAvailableBooks();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to borrow book');
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to borrow book'
      );
    }
  };

  const handleReturnBook = async () => {
    if (!selectedLendingId) return;

    try {
      const response = await fetch('/api/lendings/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lendingId: selectedLendingId }),
      });

      if (response.ok) {
        message.success('Book returned successfully!');
        setReturnModalVisible(false);
        setSelectedLendingId(null);
        fetchLendings();
        fetchAvailableBooks();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to return book');
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to return book'
      );
    }
  };

  const getStatusTag = (status: string, dueDate: Date | string) => {
    let displayStatus = status;
    let color = 'blue';

    if (status === 'borrowed' && dayjs(dueDate).isBefore(dayjs(), 'day')) {
      displayStatus = 'overdue';
      color = 'red';
    } else if (status === 'returned') {
      color = 'green';
    } else if (status === 'borrowed') {
      color = 'orange';
    }

    return (
      <Tag color={color} className='capitalize'>
        {displayStatus}
      </Tag>
    );
  };

  const columns: ColumnsType<LendingRecord> = [
    {
      title: 'Book Title',
      dataIndex: ['book', 'title'],
      key: 'bookTitle',
      render: (text: string) => <Text strong>{text}</Text>,
      sorter: (a, b) =>
        (a.book?.title || '').localeCompare(b.book?.title || ''),
    },
    {
      title: 'Borrower',
      dataIndex: ['borrower', 'name'],
      key: 'borrowerName',
      render: (text: string) => <Text strong>{text}</Text>,
      sorter: (a, b) =>
        (a.borrower?.name || '').localeCompare(b.borrower?.name || ''),
    },
    {
      title: 'Borrow Date',
      dataIndex: 'borrowDate',
      key: 'borrowDate',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a, b) => dayjs(a.borrowDate).unix() - dayjs(b.borrowDate).unix(),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a, b) => dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix(),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: LendingRecord) =>
        getStatusTag(status, record.dueDate),
      filters: lendingStatuses.map((status) => ({
        text: status.charAt(0).toUpperCase() + status.slice(1),
        value: status,
      })),
      onFilter: (value, record) => {
        const currentStatus =
          record.status === 'borrowed' &&
          dayjs(record.dueDate).isBefore(dayjs(), 'day')
            ? 'overdue'
            : record.status;
        return currentStatus === value;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (record: LendingRecord) => {
        const currentStatus =
          record.status === 'borrowed' &&
          dayjs(record.dueDate).isBefore(dayjs(), 'day')
            ? 'overdue'
            : record.status;

        return (
          <Space size='middle'>
            {currentStatus === 'borrowed' || currentStatus === 'overdue' ? (
              <Popconfirm
                title='Confirm Return'
                description='Are you sure you want to return this book?'
                onConfirm={() => {
                  setSelectedLendingId(record._id);
                  setReturnModalVisible(true);
                }}
                okText='Yes'
                cancelText='No'
                placement='left'
              >
                <Button
                  type='primary'
                  icon={<SwapOutlined />}
                  className='bg-blue-500 hover:bg-blue-600'
                >
                  Return
                </Button>
              </Popconfirm>
            ) : (
              <Button
                icon={<CheckCircleOutlined />}
                disabled
                className='text-gray-400'
              >
                Returned
              </Button>
            )}
          </Space>
        );
      },
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

  const canReadLendings =
    session?.user?.permissions?.includes(PERMISSIONS.LENDINGS_READ) || false;
  const canCreateLendings =
    session?.user?.permissions?.includes(PERMISSIONS.LENDINGS_CREATE) || false;
  const canUpdateLendings =
    session?.user?.permissions?.includes(PERMISSIONS.LENDINGS_UPDATE) || false;

  if (!canReadLendings) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='Lending Management' />
          <Content className='p-4 md:p-6'>
            <Card className='rounded-lg shadow-sm border-0'>
              <Empty
                image={<SwapOutlined className='text-5xl text-gray-300' />}
                description={
                  <div className='space-y-2'>
                    <Title level={4} className='text-gray-600 m-0'>
                      Access Restricted
                    </Title>
                    <Text type='secondary'>
                      You don't have permission to view lending records
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
        <Header title='Lending Management' />
        <Content className='p-4 md:p-6'>
          <Card
            className='rounded-lg shadow-sm border-0'
            title={
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                <div className='flex items-center gap-2'>
                  <SwapOutlined className='text-blue-500 text-xl' />
                  <Title level={4} className='m-0'>
                    Lending Records
                  </Title>
                </div>
                <div className='flex flex-col sm:flex-row gap-3'>
                  <Select
                    defaultValue='all'
                    className='w-full sm:w-48'
                    onChange={(value) => setStatusFilter(value)}
                  >
                    <Option value='all'>All Statuses</Option>
                    {lendingStatuses.map((status) => (
                      <Option key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Option>
                    ))}
                  </Select>
                  {canUpdateLendings && (
                    <Button
                      icon={<MailOutlined />}
                      onClick={handleNotifyOverdue}
                      loading={notifying}
                      className='w-full sm:w-auto'
                      disabled={notifying}
                    >
                      Notify Overdue
                    </Button>
                  )}
                  {canCreateLendings && (
                    <Button
                      type='primary'
                      icon={<PlusOutlined />}
                      onClick={() => setModalVisible(true)}
                      className='w-full sm:w-auto'
                    >
                      New Lending
                    </Button>
                  )}
                </div>
              </div>
            }
          >
            <Table
              columns={columns}
              dataSource={lendings}
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
                    current: page.current || 1,
                    pageSize: page.pageSize || 10,
                    total: pagination.total,
                  });
                },
              }}
              scroll={{ x: 'max-content' }}
              className='w-full'
              rowClassName={(record) => {
                const status =
                  record.status === 'borrowed' &&
                  dayjs(record.dueDate).isBefore(dayjs(), 'day')
                    ? 'overdue'
                    : record.status;
                return status === 'overdue' ? 'bg-red-50 hover:bg-red-100' : '';
              }}
            />
          </Card>

          <Modal
            title={
              <div className='flex items-center gap-2'>
                <SwapOutlined className='text-blue-500' />
                New Book Lending
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
            <Form form={form} layout='vertical' onFinish={handleBorrowSubmit}>
              <Form.Item
                name='bookId'
                label='Book'
                rules={[{ required: true, message: 'Please select a book' }]}
              >
                <Select
                  placeholder='Select a book'
                  showSearch
                  optionFilterProp='children'
                  filterOption={(input, option) =>
                    (option?.children as string)
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {availableBooks.map((book) => (
                    <Option key={book._id} value={book._id}>
                      {book.title}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name='borrowerId'
                label='Borrower'
                rules={[
                  { required: true, message: 'Please select a borrower' },
                ]}
              >
                <Select
                  placeholder='Select a borrower'
                  showSearch
                  optionFilterProp='children'
                  filterOption={(input, option) =>
                    (option?.children as string)
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                >
                  {borrowersList.map((borrower) => (
                    <Option key={borrower._id} value={borrower._id}>
                      {borrower.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name='dueDate'
                label='Due Date'
                rules={[
                  { required: true, message: 'Please select a due date' },
                ]}
              >
                <DatePicker className='w-full' />
              </Form.Item>
              <Form.Item name='notes' label='Notes'>
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item>
                <Button type='primary' htmlType='submit' className='w-full'>
                  Create Lending
                </Button>
              </Form.Item>
            </Form>
          </Modal>

          <Modal
            title={
              <div className='flex items-center gap-2'>
                <CheckCircleOutlined className='text-green-500' />
                Confirm Book Return
              </div>
            }
            open={returnModalVisible}
            onCancel={() => setReturnModalVisible(false)}
            footer={[
              <Button key='cancel' onClick={() => setReturnModalVisible(false)}>
                Cancel
              </Button>,
              <Button
                key='submit'
                type='primary'
                onClick={handleReturnBook}
                className='bg-green-500 hover:bg-green-600'
              >
                Confirm Return
              </Button>,
            ]}
          >
            <Text>Are you sure you want to mark this book as returned?</Text>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}

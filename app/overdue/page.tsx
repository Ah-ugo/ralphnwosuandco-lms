/** @format */

'use client';

import { useState, useEffect } from 'react';
import {
  Layout,
  Table,
  Tag,
  Typography,
  Spin,
  Alert,
  Card,
  Button,
  Popconfirm,
  Space,
  Badge,
} from 'antd';
import {
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { LendingRecord } from '@/lib/models';
import dayjs from 'dayjs';
import { PERMISSIONS } from '@/lib/auth';
import { message } from 'antd';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function OverdueBooksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [overdueLendings, setOverdueLendings] = useState<LendingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchOverdueLendings();
    }
  }, [status, router, pagination.current, pagination.pageSize]);

  const fetchOverdueLendings = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
        status: 'overdue',
      });
      const response = await fetch(`/api/lendings?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch overdue lendings');

      const data = await response.json();
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

      setOverdueLendings(formattedLendings);
      setPagination((prev) => ({ ...prev, total: data.total }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching overdue books'
      );
      message.error('Failed to load overdue books');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnBook = async (lendingId: string) => {
    try {
      const response = await fetch('/api/lendings/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lendingId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to mark book as returned');
      }

      message.success('Book marked as returned successfully!');
      fetchOverdueLendings();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Failed to mark book as returned'
      );
    }
  };

  const columns = [
    {
      title: 'Book Title',
      dataIndex: ['book', 'title'],
      key: 'bookTitle',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Borrower Name',
      dataIndex: ['borrower', 'name'],
      key: 'borrowerName',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Borrow Date',
      dataIndex: 'borrowDate',
      key: 'borrowDate',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a: LendingRecord, b: LendingRecord) =>
        dayjs(a.borrowDate).unix() - dayjs(b.borrowDate).unix(),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a: LendingRecord, b: LendingRecord) =>
        dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix(),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: any, record: LendingRecord) => {
        const daysOverdue = dayjs().diff(dayjs(record.dueDate), 'days');
        let statusText = '';
        let statusColor = '';

        if (daysOverdue > 30) {
          statusText = 'Severely Overdue';
          statusColor = 'red';
        } else if (daysOverdue > 14) {
          statusText = 'Highly Overdue';
          statusColor = 'volcano';
        } else {
          statusText = 'Overdue';
          statusColor = 'orange';
        }

        return (
          <Badge
            status='error'
            text={
              <Tag color={statusColor}>
                {statusText} ({daysOverdue} days)
              </Tag>
            }
          />
        );
      },
      sorter: (a: LendingRecord, b: LendingRecord) => {
        const daysA = dayjs().diff(dayjs(a.dueDate), 'days');
        const daysB = dayjs().diff(dayjs(b.dueDate), 'days');
        return daysB - daysA;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_: any, record: LendingRecord) => (
        <Space size='middle'>
          {session?.user?.permissions?.includes(
            PERMISSIONS.LENDINGS_UPDATE
          ) && (
            <Popconfirm
              title='Mark as Returned'
              description='Are you sure this book has been returned?'
              onConfirm={() => handleReturnBook(record._id!)}
              okText='Yes'
              cancelText='No'
              placement='left'
            >
              <Button
                type='text'
                icon={<CheckCircleOutlined />}
                className='text-green-500 hover:text-green-700'
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

  const canReadLendings =
    session?.user?.permissions?.includes(PERMISSIONS.LENDINGS_READ) || false;

  if (!canReadLendings) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='Overdue Books' />
          <Content className='p-4 md:p-6'>
            <Card className='rounded-lg shadow-sm border-0'>
              <Empty
                image={
                  <ExclamationCircleOutlined className='text-5xl text-gray-300' />
                }
                description={
                  <div className='space-y-2'>
                    <Title level={4} className='text-gray-600 m-0'>
                      Access Restricted
                    </Title>
                    <Text type='secondary'>
                      You don't have permission to view overdue books
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
        <Header title='Overdue Books' />
        <Content className='p-4 md:p-6'>
          <Card
            className='rounded-lg shadow-sm border-0'
            bodyStyle={{ padding: 0 }}
          >
            <div className='p-4 border-b border-gray-200'>
              <div className='flex items-center gap-2 mb-2'>
                <ExclamationCircleOutlined className='text-red-500 text-xl' />
                <Title level={4} className='m-0'>
                  Overdue Books
                </Title>
              </div>
              <Text type='secondary'>Books that are past their due date</Text>
            </div>

            {error ? (
              <Alert
                message='Error Loading Overdue Books'
                description={error}
                type='error'
                showIcon
                className='m-4'
              />
            ) : (
              <Table
                columns={columns}
                dataSource={overdueLendings}
                loading={loading}
                rowKey='_id'
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} overdue books`,
                  onChange: (page, pageSize) => {
                    setPagination((prev) => ({
                      ...prev,
                      current: page,
                      pageSize: pageSize || 10,
                    }));
                  },
                }}
                scroll={{ x: 'max-content' }}
                className='w-full'
                rowClassName={(record) =>
                  dayjs().diff(dayjs(record.dueDate), 'days') > 30
                    ? 'bg-red-50 hover:bg-red-100'
                    : 'bg-orange-50 hover:bg-orange-100'
                }
              />
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}

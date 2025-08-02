/** @format */

'use client';

import { useState, useEffect } from 'react';
import {
  Layout,
  Table,
  Typography,
  Spin,
  Alert,
  Card,
  Tag,
  Empty,
  Badge,
} from 'antd';
import { HistoryOutlined } from '@ant-design/icons';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { LendingRecord } from '@/lib/models';
import dayjs from 'dayjs';
import { PERMISSIONS } from '@/lib/auth';

const { Content } = Layout;
const { Title, Text } = Typography;

type LendingStatus = 'borrowed' | 'returned' | 'overdue';
export const dynamic = 'force-dynamic';
export default function LendingHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [lendingHistory, setLendingHistory] = useState<LendingRecord[]>([]);
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
      fetchLendingHistory();
    }
  }, [status, router, pagination.current, pagination.pageSize]);

  const fetchLendingHistory = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
      });
      const response = await fetch(`/api/lendings?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch lending history');

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

      setLendingHistory(formattedLendings);
      setPagination((prev) => ({ ...prev, total: data.total }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while fetching lending history'
      );
      message.error('Failed to load lending history');
    } finally {
      setLoading(false);
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

  const columns = [
    {
      title: 'Book Title',
      dataIndex: ['book', 'title'],
      key: 'bookTitle',
      render: (text: string) => <Text strong>{text}</Text>,
      sorter: (a: any, b: any) =>
        (a.book?.title || '').localeCompare(b.book?.title || ''),
    },
    {
      title: 'Borrower Name',
      dataIndex: ['borrower', 'name'],
      key: 'borrowerName',
      render: (text: string) => <Text strong>{text}</Text>,
      sorter: (a: any, b: any) =>
        (a.borrower?.name || '').localeCompare(b.borrower?.name || ''),
    },
    {
      title: 'Borrow Date',
      dataIndex: 'borrowDate',
      key: 'borrowDate',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a: any, b: any) =>
        dayjs(a.borrowDate).unix() - dayjs(b.borrowDate).unix(),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a: any, b: any) =>
        dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix(),
    },
    {
      title: 'Return Date',
      dataIndex: 'returnDate',
      key: 'returnDate',
      render: (date: string) =>
        date ? dayjs(date).format('MMM D, YYYY') : '-',
      sorter: (a: any, b: any) => {
        if (!a.returnDate) return 1;
        if (!b.returnDate) return -1;
        return dayjs(a.returnDate).unix() - dayjs(b.returnDate).unix();
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: LendingRecord) => {
        const currentStatus =
          status === 'borrowed' &&
          dayjs(record.dueDate).isBefore(dayjs(), 'day')
            ? 'overdue'
            : status;

        return (
          <Badge
            status={
              currentStatus === 'overdue'
                ? 'error'
                : currentStatus === 'returned'
                ? 'success'
                : 'processing'
            }
            text={getStatusTag(status, record.dueDate)}
          />
        );
      },
      filters: [
        { text: 'Borrowed', value: 'borrowed' },
        { text: 'Returned', value: 'returned' },
        { text: 'Overdue', value: 'overdue' },
      ],
      onFilter: (value: any, record: any) => {
        const currentStatus =
          record.status === 'borrowed' &&
          dayjs(record.dueDate).isBefore(dayjs(), 'day')
            ? 'overdue'
            : record.status;
        return currentStatus === value;
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

  if (!canReadLendings) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='Lending History' />
          <Content className='p-4 md:p-6'>
            <Card className='rounded-lg shadow-sm border-0'>
              <Empty
                image={<HistoryOutlined className='text-5xl text-gray-300' />}
                description={
                  <div className='space-y-2'>
                    <Title level={4} className='text-gray-600 m-0'>
                      Access Restricted
                    </Title>
                    <Text type='secondary'>
                      You don't have permission to view lending history
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
        <Header title='Lending History' />
        <Content className='p-4 md:p-6'>
          <Card
            className='rounded-lg shadow-sm border-0'
            title={
              <div className='flex items-center gap-2'>
                <HistoryOutlined className='text-blue-500 text-xl' />
                <Title level={4} className='m-0'>
                  Lending History
                </Title>
              </div>
            }
          >
            {error ? (
              <Alert
                message='Error Loading Lending History'
                description={error}
                type='error'
                showIcon
                className='mb-4'
              />
            ) : loading ? (
              <div className='text-center py-8'>
                <Spin size='large' tip='Loading lending history...' />
              </div>
            ) : lendingHistory.length === 0 ? (
              <Empty
                description={
                  <div className='space-y-2'>
                    <Text strong>No lending records found</Text>
                    <Text type='secondary'>
                      All lending history will appear here
                    </Text>
                  </div>
                }
                className='py-8'
              />
            ) : (
              <Table
                columns={columns}
                dataSource={lendingHistory}
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
                  return status === 'overdue'
                    ? 'bg-red-50 hover:bg-red-100'
                    : '';
                }}
              />
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}

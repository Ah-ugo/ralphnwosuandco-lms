/** @format */

'use client';

import { useState, useEffect } from 'react';
import {
  Layout,
  Card,
  Row,
  Col,
  Statistic,
  Spin,
  Alert,
  Typography,
  Empty,
  Button,
} from 'antd';
import {
  BookOutlined,
  UserOutlined,
  SwapOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  FireOutlined,
  DashboardOutlined,
} from '@ant-design/icons';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { DashboardStats } from '@/lib/models';
import { PERMISSIONS } from '@/lib/auth';

const { Content } = Layout;
const { Title, Text } = Typography;

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchDashboardStats();
    }
  }, [status, router]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className='min-h-screen flex justify-center items-center'>
        <Spin size='large' tip='Loading...' />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Redirect handled by useEffect
  }

  const canReadDashboard =
    session?.user?.permissions?.includes(PERMISSIONS.DASHBOARD_READ) || false;

  if (!canReadDashboard) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='Dashboard' />
          <Content className='p-4 md:p-6'>
            <Card className='rounded-lg shadow-sm border-0'>
              <Empty
                image={<DashboardOutlined className='text-5xl text-gray-300' />}
                description={
                  <div className='space-y-2'>
                    <Title level={4} className='text-gray-600 m-0'>
                      Access Restricted
                    </Title>
                    <Text type='secondary'>
                      You don't have permission to view the dashboard
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

  if (loading) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='Dashboard' />
          <Content className='flex justify-center items-center min-h-[calc(100vh-64px)]'>
            <Spin size='large' tip='Loading dashboard...' />
          </Content>
        </Layout>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='Dashboard' />
          <Content className='p-4 md:p-6'>
            <Alert
              message='Error Loading Dashboard'
              description={error}
              type='error'
              showIcon
              className='mb-4'
            />
            <Button
              type='primary'
              onClick={fetchDashboardStats}
              loading={loading}
            >
              Retry
            </Button>
          </Content>
        </Layout>
      </Layout>
    );
  }

  return (
    <Layout className='min-h-screen bg-gray-50'>
      <Sidebar />
      <Layout className='ml-0 lg:ml-[250px] transition-all'>
        <Header title='Dashboard' />
        <Content className='p-4 md:p-6'>
          {/* Stats Cards */}
          <Row gutter={[16, 16]} className='mb-6'>
            {[
              {
                title: 'Total Books',
                value: stats?.totalBooks,
                icon: <BookOutlined className='text-blue-500' />,
                color: '#1890ff',
              },
              {
                title: 'Available Books',
                value: stats?.availableBooks,
                icon: <CheckCircleOutlined className='text-green-500' />,
                color: '#52c41a',
              },
              {
                title: 'Active Lendings',
                value: stats?.activeLendings,
                icon: <SwapOutlined className='text-orange-500' />,
                color: '#fa8c16',
              },
              {
                title: 'Overdue Books',
                value: stats?.overdueBooks,
                icon: <ExclamationCircleOutlined className='text-red-500' />,
                color: '#ff4d4f',
              },
              {
                title: 'Total Borrowers',
                value: stats?.totalBorrowers,
                icon: <UserOutlined className='text-purple-500' />,
                color: '#722ed1',
              },
            ].map((stat, index) => (
              <Col key={index} xs={24} sm={12} lg={8} xl={6}>
                <Card
                  className='rounded-lg shadow-sm hover:shadow-md transition-shadow h-full'
                  bodyStyle={{ padding: '16px' }}
                >
                  <Statistic
                    title={stat.title}
                    value={stat.value || 0}
                    prefix={stat.icon}
                    valueStyle={{ color: stat.color }}
                    loading={loading}
                  />
                </Card>
              </Col>
            ))}
          </Row>

          {/* Most Borrowed Books Section */}
          <Card
            title={
              <div className='flex items-center gap-2'>
                <FireOutlined className='text-orange-500' />
                <Text strong className='text-lg'>
                  Most Borrowed Books
                </Text>
              </div>
            }
            className='rounded-lg shadow-sm'
            bodyStyle={{ padding: '16px 0' }}
          >
            {stats?.mostBorrowedBooks?.length ? (
              <div className='divide-y divide-gray-200'>
                {stats.mostBorrowedBooks.map((book, index) => (
                  <div
                    key={book._id?.toString() || index}
                    className='flex justify-between items-center py-3 px-4 hover:bg-gray-50 transition-colors'
                  >
                    <div className='flex flex-col'>
                      <Text strong className='text-base'>
                        {book.title}
                      </Text>
                      <Text type='secondary' className='text-sm'>
                        {book.author}
                      </Text>
                    </div>
                    <div className='flex items-center gap-1'>
                      <Text strong className='text-blue-600'>
                        {book.borrowCount}
                      </Text>
                      <Text type='secondary' className='text-sm'>
                        {book.borrowCount === 1 ? 'borrow' : 'borrows'}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty
                description='No borrowing data available'
                className='py-8'
              />
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}

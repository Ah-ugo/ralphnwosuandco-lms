/** @format */

'use client';

import { useState, useEffect } from 'react';
import {
  Layout,
  List,
  Card,
  Typography,
  Spin,
  Alert,
  Button,
  Badge,
  Space,
  Popconfirm,
  Tag,
  Empty,
  message,
} from 'antd';
import {
  BellOutlined,
  CheckCircleOutlined,
  MailOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/lib/models';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { PERMISSIONS } from '@/lib/auth';

dayjs.extend(relativeTime);

const { Content } = Layout;
const { Title, Text } = Typography;

type NotificationType = 'success' | 'warning' | 'error' | 'info';
export const dynamic = 'force-dynamic';
export default function NotificationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchNotifications();
    }
  }, [status, router]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/notifications');
      if (!response.ok) throw new Error('Failed to fetch notifications');

      const data = await response.json();
      const formattedNotifications = data.notifications.map(
        (n: Notification) => ({
          ...n,
          _id: n._id?.toString(),
        })
      );

      setNotifications(formattedNotifications);
      setUnreadCount(formattedNotifications.filter((n: any) => !n.read).length);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      message.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to mark as read');

      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => prev - 1);
      message.success('Notification marked as read');
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Failed to mark as read'
      );
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
      });
      if (!response.ok) throw new Error('Failed to mark all as read');

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      message.success('All notifications marked as read');
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Failed to mark all as read'
      );
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete notification');

      setNotifications((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount(
        (prev) => prev - (notifications.find((n) => n._id === id)?.read ? 0 : 1)
      );
      message.success('Notification deleted');
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Failed to delete notification'
      );
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    const iconProps = { className: 'text-xl' };
    switch (type) {
      case 'success':
        return (
          <CheckCircleOutlined {...iconProps} style={{ color: '#52c41a' }} />
        );
      case 'warning':
        return <WarningOutlined {...iconProps} style={{ color: '#faad14' }} />;
      case 'error':
        return (
          <CloseCircleOutlined {...iconProps} style={{ color: '#ff4d4f' }} />
        );
      case 'info':
      default:
        return <MailOutlined {...iconProps} style={{ color: '#1890ff' }} />;
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
    return null;
  }

  const canReadNotifications =
    session?.user?.permissions?.includes(PERMISSIONS.NOTIFICATIONS_READ) ||
    false;
  const canUpdateNotifications =
    session?.user?.permissions?.includes(PERMISSIONS.NOTIFICATIONS_UPDATE) ||
    false;
  const canDeleteNotifications =
    session?.user?.permissions?.includes(PERMISSIONS.NOTIFICATIONS_DELETE) ||
    false;

  if (!canReadNotifications) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='Notifications' />
          <Content className='p-4 md:p-6'>
            <Card className='rounded-lg shadow-sm border-0'>
              <Empty
                image={<BellOutlined className='text-5xl text-gray-300' />}
                description={
                  <div className='space-y-2'>
                    <Title level={4} className='text-gray-600 m-0'>
                      Access Restricted
                    </Title>
                    <Text type='secondary'>
                      You don't have permission to view notifications
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
        <Header title='Notifications' />
        <Content className='p-4 md:p-6'>
          <Card
            className='rounded-lg shadow-sm border-0'
            title={
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <Badge count={unreadCount} offset={[10, 0]}>
                    <BellOutlined className='text-blue-500 text-xl' />
                  </Badge>
                  <Title level={4} className='m-0'>
                    Your Notifications
                  </Title>
                </div>
                {canUpdateNotifications && unreadCount > 0 && (
                  <Button
                    type='link'
                    icon={<EyeOutlined />}
                    onClick={markAllAsRead}
                    className='text-blue-500'
                  >
                    Mark all as read
                  </Button>
                )}
              </div>
            }
          >
            {error ? (
              <Alert
                message='Error Loading Notifications'
                description={error}
                type='error'
                showIcon
                className='mb-4'
              />
            ) : loading ? (
              <div className='text-center py-8'>
                <Spin size='large' tip='Loading notifications...' />
              </div>
            ) : notifications.length === 0 ? (
              <Empty
                description={
                  <div className='space-y-2'>
                    <Text strong>No notifications</Text>
                    <Text type='secondary'>You're all caught up!</Text>
                  </div>
                }
                className='py-8'
              />
            ) : (
              <List
                itemLayout='horizontal'
                dataSource={notifications}
                renderItem={(item) => (
                  <List.Item
                    key={item._id}
                    className={`p-4 rounded-lg mb-2 transition-colors ${
                      item.read
                        ? 'bg-gray-50 hover:bg-gray-100'
                        : 'bg-blue-50 hover:bg-blue-100'
                    }`}
                    actions={[
                      !item.read && canUpdateNotifications ? (
                        <Button
                          key='mark-read'
                          type='text'
                          icon={<EyeOutlined />}
                          onClick={() => markAsRead(item._id!)}
                          className='text-green-500'
                          title='Mark as read'
                        />
                      ) : null,
                      canDeleteNotifications && (
                        <Popconfirm
                          key='delete'
                          title='Delete notification?'
                          description='Are you sure you want to delete this notification?'
                          onConfirm={() => deleteNotification(item._id!)}
                          okText='Yes'
                          cancelText='No'
                        >
                          <Button
                            type='text'
                            icon={<DeleteOutlined />}
                            className='text-red-500'
                            title='Delete'
                          />
                        </Popconfirm>
                      ),
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      avatar={getNotificationIcon(
                        item.type as NotificationType
                      )}
                      title={
                        <Text
                          strong={!item.read}
                          className={`${
                            item.read ? 'text-gray-700' : 'text-gray-900'
                          }`}
                        >
                          {item.message}
                        </Text>
                      }
                      description={
                        <Space>
                          <Text type='secondary' className='text-xs'>
                            {dayjs(item.createdAt).fromNow()}
                          </Text>
                          {!item.read && (
                            <Tag color='blue' className='text-xs'>
                              New
                            </Tag>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}

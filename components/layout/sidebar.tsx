/** @format */

'use client';
import { Layout, Menu, Typography } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  UserOutlined,
  SwapOutlined,
  ExclamationCircleOutlined,
  SearchOutlined,
  HistoryOutlined,
  BellOutlined,
  ApiOutlined,
  LogoutOutlined,
  SettingOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { PERMISSIONS } from '@/lib/auth';
import clsx from 'clsx';

const { Sider } = Layout;
const { Title } = Typography;

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();

  const userPermissions = session?.user?.permissions || [];

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined className='text-lg' />,
      label: 'Dashboard',
      onClick: () => router.push('/'),
      permission: PERMISSIONS.DASHBOARD_READ,
    },
    {
      key: '/books/',
      icon: <BookOutlined className='text-lg' />,
      label: 'Books',
      onClick: () => router.push('/books'),
      permission: PERMISSIONS.BOOKS_READ,
    },
    {
      key: '/borrowers/',
      icon: <UserOutlined className='text-lg' />,
      label: 'Borrowers',
      onClick: () => router.push('/borrowers'),
      permission: PERMISSIONS.BORROWERS_READ,
    },
    {
      key: '/lending/',
      icon: <SwapOutlined className='text-lg' />,
      label: 'Lending',
      onClick: () => router.push('/lending'),
      permission: PERMISSIONS.LENDINGS_READ,
    },
    {
      key: '/overdue/',
      icon: <ExclamationCircleOutlined className='text-lg' />,
      label: 'Overdue Books',
      onClick: () => router.push('/overdue'),
      permission: PERMISSIONS.LENDINGS_READ,
    },
    {
      key: '/history/',
      icon: <HistoryOutlined className='text-lg' />,
      label: 'Lending History',
      onClick: () => router.push('/history'),
      permission: PERMISSIONS.LENDINGS_READ,
    },
    {
      key: '/notifications/',
      icon: <BellOutlined className='text-lg' />,
      label: 'Notifications',
      onClick: () => router.push('/notifications'),
      permission: PERMISSIONS.NOTIFICATIONS_READ,
    },
    {
      key: '/users/',
      icon: <SettingOutlined className='text-lg' />,
      label: 'User Management',
      onClick: () => router.push('/users'),
      permission: PERMISSIONS.USERS_READ,
    },
    {
      key: '/cases/',
      icon: <FolderOutlined className='text-lg' />,
      label: 'Case Management',
      onClick: () => router.push('/cases'),
      permission: PERMISSIONS.CASES_READ,
    },
    {
      key: '/api-docs/',
      icon: <ApiOutlined className='text-lg' />,
      label: 'API Docs',
      onClick: () => router.push('/api-docs'),
      permission: PERMISSIONS.API_DOCS_READ,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined className='text-lg' />,
      label: 'Logout',
      danger: true,
      onClick: () => signOut({ callbackUrl: '/auth/signin' }),
      permission: 'any',
    },
  ];

  const filteredMenuItems = menuItems
    .filter(
      (item) =>
        item.permission === 'any' || userPermissions.includes(item.permission)
    )
    .map((item) => {
      const { permission, ...rest } = item;
      return {
        ...rest,
        className: clsx(
          '!flex !items-center !h-12 !py-0 !my-1 !mx-2 !rounded-md',
          {
            '!bg-primary/10 !text-primary': pathname === item.key,
            'hover:!bg-white/10': pathname !== item.key,
          }
        ),
      };
    });

  return (
    <Sider
      breakpoint='lg'
      collapsedWidth='0'
      width={250}
      className='fixed h-full z-50'
      theme='dark'
    >
      <div className='h-16 flex px-4 border-b border-gray-700'>
        <h1 className='text-white m-0 text-xl mt-4 font-bold'>
          Ralph Nwosu & Co.
        </h1>
      </div>
      <Menu
        theme='dark'
        mode='inline'
        selectedKeys={[pathname || '/']}
        items={filteredMenuItems}
        className='h-[calc(100%-64px)] border-r-0'
      />
    </Sider>
  );
}

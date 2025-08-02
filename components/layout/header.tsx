/** @format */

'use client';

import { Layout, Typography, Button, Dropdown, Space, Avatar } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { User } from '@/lib/models';

const { Header: AntHeader } = Layout;
const { Title } = Typography;

interface HeaderProps {
  title: string;
}

export default function Header({ title }: HeaderProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const user = session?.user as User | undefined;

  const handleMenuClick = (key: string) => {
    if (key === 'logout') {
      signOut({ callbackUrl: '/auth/signin' });
    } else if (key === 'profile') {
      // Navigate to user profile page, if exists
      router.push('/profile');
    } else if (key === 'settings') {
      router.push('/users'); // Assuming user management is the settings page
    }
  };

  const items = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <UserOutlined />,
    },
    {
      key: 'settings',
      label: 'Settings',
      icon: <SettingOutlined />,
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      danger: true,
    },
  ];

  return (
    <AntHeader className='flex justify-between items-center bg-white px-6 shadow-sm'>
      <Title level={3} className='m-0 text-gray-800'>
        {title}
      </Title>
      <Dropdown
        menu={{ items, onClick: ({ key }: any) => handleMenuClick(key) }}
        trigger={['click']}
      >
        <Button type='text' className='flex items-center space-x-2 p-0 h-auto'>
          <Space>
            <Avatar icon={<UserOutlined />} src={user?.image || undefined} />
            <span className='text-gray-700 font-medium hidden md:inline'>
              {user?.name || user?.email || 'Guest'}
            </span>
            <DownOutlined className='text-gray-500 text-xs' />
          </Space>
        </Button>
      </Dropdown>
    </AntHeader>
  );
}

/** @format */
'use client';

import { Layout, Spin } from 'antd';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';

const { Content } = Layout;

export default function CasesLoading() {
  return (
    <Layout className='min-h-screen bg-gray-50'>
      <Sidebar />
      <Layout className='ml-0 lg:ml-[250px] transition-all'>
        <Header title='Case Management' />
        <Content className='p-4 md:p-6'>
          <div className='flex justify-center items-center h-[calc(100vh-120px)]'>
            <Spin size='large' tip='Loading Cases...' />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}

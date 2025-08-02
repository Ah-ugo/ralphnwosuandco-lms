/** @format */

'use client';

import { useEffect, useState } from 'react';
import 'swagger-ui-react/swagger-ui.css';
import dynamic from 'next/dynamic';
import { Layout, Spin, Alert } from 'antd';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PERMISSIONS } from '@/lib/auth';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

const { Content } = Layout;

export default function ApiDocsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [spec, setSpec] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchSwaggerSpec();
    }
  }, [status, router]);

  const fetchSwaggerSpec = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/docs');
      if (!response.ok) {
        throw new Error('Failed to fetch API documentation');
      }
      const data = await response.json();
      setSpec(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className='min-h-screen flex justify-center items-center'>
        <Spin size='large' />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null; // Redirect handled by useEffect
  }

  const canReadApiDocs =
    session?.user?.permissions?.includes(PERMISSIONS.API_DOCS_READ) || false;

  if (!canReadApiDocs) {
    return (
      <Layout className='min-h-screen'>
        <Sidebar />
        <Layout>
          <Header title='API Documentation' />
          <Content className='p-6 bg-gray-100 flex justify-center items-center'>
            <div className='text-center p-10 bg-white rounded-lg shadow-md'>
              <h3 className='text-2xl text-gray-600 mb-4'>Access Restricted</h3>
              <p className='text-gray-500'>
                You don't have permission to view API documentation.
              </p>
            </div>
          </Content>
        </Layout>
      </Layout>
    );
  }

  return (
    <Layout className='min-h-screen'>
      <Sidebar />
      <Layout className='ml-0 lg:ml-[250px]'>
        <Header title='API Documentation' />
        <Content className='p-6 bg-gray-100'>
          {loading && (
            <div className='flex justify-center items-center h-96'>
              <Spin size='large' />
            </div>
          )}
          {error && (
            <Alert
              message='Error'
              description={error}
              type='error'
              showIcon
              className='mb-4'
            />
          )}
          {!loading && !error && spec && <SwaggerUI spec={spec} />}
        </Content>
      </Layout>
    </Layout>
  );
}

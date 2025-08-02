/** @format */

'use client';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button, Form, Input, Typography, Card, Alert, Spin } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text } = Typography;
// export const dynamic = 'force-dynamic';

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    const result = await signIn('credentials', {
      redirect: false,
      email: values.email,
      password: values.password,
    });

    if (result?.error) {
      setError(result.error);
    } else {
      router.push('/');
      console.log(result);
    }
    setLoading(false);
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100 p-4'>
      <Card className='w-full max-w-md rounded-lg shadow-lg p-6'>
        <div className='text-center mb-8'>
          <Title level={2} className='text-gray-800'>
            Welcome Back
          </Title>
          <Text className='text-gray-600'>Sign in to your account</Text>
        </div>

        {error && (
          <Alert
            message='Login Failed'
            description={error}
            type='error'
            showIcon
            closable
            onClose={() => setError(null)}
            className='mb-6'
          />
        )}

        <Form
          name='login'
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout='vertical'
        >
          <Form.Item
            name='email'
            rules={[
              { required: true, message: 'Please input your Email!' },
              { type: 'email', message: 'Invalid email format!' },
            ]}
          >
            <Input
              prefix={
                <MailOutlined className='site-form-item-icon text-gray-400' />
              }
              placeholder='Email'
              size='large'
            />
          </Form.Item>

          <Form.Item
            name='password'
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password
              prefix={
                <LockOutlined className='site-form-item-icon text-gray-400' />
              }
              placeholder='Password'
              size='large'
            />
          </Form.Item>

          <Form.Item>
            <Button
              type='primary'
              htmlType='submit'
              className='w-full bg-blue-600 hover:bg-blue-700 border-blue-600 hover:border-blue-700'
              size='large'
              loading={loading}
            >
              {loading ? <Spin size='small' /> : 'Log in'}
            </Button>
          </Form.Item>
        </Form>

        <div className='text-center mt-6'>
          <Text className='text-gray-600'>
            Don't have an account?{' '}
            <Link
              href='/auth/register'
              className='text-blue-600 hover:underline'
            >
              Register now!
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}

/** @format */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Form, Input, Typography, Card, Alert, Spin } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text } = Typography;
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const onFinish = async (values: any) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess('Registration successful! You can now sign in.');
      // Optionally redirect after a short delay
      setTimeout(() => {
        router.push('/auth/signin');
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An unknown error occurred during registration.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-100 p-4'>
      <Card className='w-full max-w-md rounded-lg shadow-lg p-6'>
        <div className='text-center mb-8'>
          <Title level={2} className='text-gray-800'>
            Create Account
          </Title>
          <Text className='text-gray-600'>Join our library system</Text>
        </div>

        {error && (
          <Alert
            message='Registration Failed'
            description={error}
            type='error'
            showIcon
            closable
            onClose={() => setError(null)}
            className='mb-6'
          />
        )}
        {success && (
          <Alert
            message='Success'
            description={success}
            type='success'
            showIcon
            closable
            onClose={() => setSuccess(null)}
            className='mb-6'
          />
        )}

        <Form
          name='register'
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout='vertical'
        >
          <Form.Item
            name='name'
            rules={[{ required: true, message: 'Please input your Name!' }]}
          >
            <Input
              prefix={
                <UserOutlined className='site-form-item-icon text-gray-400' />
              }
              placeholder='Full Name'
              size='large'
            />
          </Form.Item>

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
            hasFeedback
          >
            <Input.Password
              prefix={
                <LockOutlined className='site-form-item-icon text-gray-400' />
              }
              placeholder='Password'
              size='large'
            />
          </Form.Item>

          <Form.Item
            name='confirm'
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your Password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(
                      'The two passwords that you entered do not match!'
                    )
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={
                <LockOutlined className='site-form-item-icon text-gray-400' />
              }
              placeholder='Confirm Password'
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
              {loading ? <Spin size='small' /> : 'Register'}
            </Button>
          </Form.Item>
        </Form>

        <div className='text-center mt-6'>
          <Text className='text-gray-600'>
            Already have an account?{' '}
            <Link href='/auth/signin' className='text-blue-600 hover:underline'>
              Sign in!
            </Link>
          </Text>
        </div>
      </Card>
    </div>
  );
}

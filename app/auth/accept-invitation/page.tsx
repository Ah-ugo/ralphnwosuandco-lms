/** @format */

'use client';
import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Card,
  Form,
  Input,
  Button,
  Typography,
  Alert,
  Spin,
  Divider,
  Space,
} from 'antd';
import { LockOutlined, UserOutlined, MailOutlined } from '@ant-design/icons';
import Link from 'next/link';

const { Title, Text } = Typography;

export default function AcceptInvitationPage() {
  const [form] = Form.useForm();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/users/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          name: values.name,
          password: values.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setSuccess(true);
      setTimeout(() => router.push('/auth/signin'), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 p-4'>
        <Card className='w-full max-w-md shadow-sm'>
          <div className='text-center mb-6'>
            <Title level={3} className='mb-2'>
              Invalid Invitation
            </Title>
            <Text type='secondary'>
              The invitation link is missing a token.
            </Text>
          </div>
          <Alert
            message='Invalid Invitation Link'
            description='The invitation link you used is incomplete. Please request a new invitation.'
            type='error'
            showIcon
            className='mb-4'
          />
          <Button type='primary' block onClick={() => router.push('/')}>
            Return to Home
          </Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50 p-4'>
        <Card className='w-full max-w-md shadow-sm'>
          <div className='text-center mb-6'>
            <Title level={3} className='mb-2'>
              Account Setup Complete!
            </Title>
            <Text type='secondary'>
              You can now sign in with your new credentials.
            </Text>
          </div>
          <Alert
            message='Success'
            description='Your account has been successfully created. Redirecting to login page...'
            type='success'
            showIcon
            className='mb-4'
          />
          <Spin spinning={true} className='block mx-auto mb-4' />
          <Button
            type='primary'
            block
            onClick={() => router.push('/auth/signin')}
          >
            Go to Sign In
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-gray-50 p-4'>
      <Card className='w-full max-w-md shadow-sm'>
        <div className='text-center mb-6'>
          <Title level={3} className='mb-2'>
            Complete Your Registration
          </Title>
          <Text type='secondary'>Set up your account to get started</Text>
        </div>

        {error && (
          <Alert
            message='Error'
            description={error}
            type='error'
            showIcon
            className='mb-4'
          />
        )}

        <Form
          form={form}
          layout='vertical'
          onFinish={onFinish}
          autoComplete='off'
        >
          <Form.Item
            name='name'
            label='Full Name'
            rules={[
              { required: true, message: 'Please input your full name!' },
              { min: 2, message: 'Name must be at least 2 characters' },
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder='John Doe'
              size='large'
            />
          </Form.Item>

          <Form.Item
            name='password'
            label='Password'
            rules={[
              { required: true, message: 'Please input your password!' },
              //   { min: 8, message: 'Password must be at least 8 characters' },
            ]}
            hasFeedback
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder='Password'
              size='large'
            />
          </Form.Item>

          <Form.Item
            name='confirm'
            label='Confirm Password'
            dependencies={['password']}
            hasFeedback
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error('The passwords do not match!')
                  );
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder='Confirm Password'
              size='large'
            />
          </Form.Item>

          <Form.Item>
            <Button
              type='primary'
              htmlType='submit'
              block
              size='large'
              loading={loading}
            >
              Complete Registration
            </Button>
          </Form.Item>
        </Form>

        <Divider>Already have an account?</Divider>

        <Space direction='vertical' className='w-full'>
          <Button
            type='default'
            block
            onClick={() => router.push('/auth/signin')}
          >
            Sign In
          </Button>
          <Button type='text' block onClick={() => router.push('/')}>
            Return to Home
          </Button>
        </Space>
      </Card>
    </div>
  );
}

/** @format */

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Form, Input, Button, message, Card, Typography } from 'antd';
import { LockOutlined } from '@ant-design/icons';

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const onFinish = async (values: { newPassword: string }) => {
    if (!token) {
      message.error('Invalid reset token');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/users/password/reset/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          newPassword: values.newPassword,
        }),
      });

      if (response.ok) {
        message.success('Password reset successfully!');
        router.push('/auth/signin');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to reset password'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex justify-center items-center min-h-screen bg-gray-50'>
      <Card className='w-full max-w-md shadow-lg'>
        <Typography.Title level={3} className='text-center mb-6'>
          Reset Your Password
        </Typography.Title>

        <Form name='reset_password' onFinish={onFinish} layout='vertical'>
          <Form.Item
            name='newPassword'
            label='New Password'
            rules={[
              { required: true, message: 'Please input your new password!' },
              { min: 8, message: 'Password must be at least 8 characters' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder='New password'
            />
          </Form.Item>

          <Form.Item
            name='confirm'
            label='Confirm Password'
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your password!' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject('The two passwords do not match!');
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder='Confirm new password'
            />
          </Form.Item>

          <Form.Item>
            <Button type='primary' htmlType='submit' loading={loading} block>
              Reset Password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

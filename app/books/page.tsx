/** @format */

'use client';

import { useState, useEffect } from 'react';
import {
  Layout,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Typography,
  Space,
  message,
  Popconfirm,
  Tag,
  Select,
  Card,
  Spin,
  Badge,
  Empty,
  Tooltip,
  Alert,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  BookOutlined,
  SearchOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Book } from '@/lib/models';
import { PERMISSIONS } from '@/lib/auth';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

type BookCategory =
  | 'Textbook'
  | 'Statute'
  | 'Law Report'
  | 'Case Law'
  | 'Journal'
  | 'Reference';

export const dynamic = 'force-dynamic';

export default function BooksPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [form] = Form.useForm();
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const bookCategories: BookCategory[] = [
    'Textbook',
    'Statute',
    'Law Report',
    'Case Law',
    'Journal',
    'Reference',
  ];
  const categoryColors: Record<BookCategory, string> = {
    Textbook: 'blue',
    Statute: 'geekblue',
    'Law Report': 'cyan',
    'Case Law': 'purple',
    Journal: 'magenta',
    Reference: 'orange',
  };

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchBooks();
    }
  }, [status, router, pagination.current, pagination.pageSize, searchQuery]);

  const fetchBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.current.toString(),
        limit: pagination.pageSize.toString(),
        search: searchQuery,
      });
      const response = await fetch(`/api/books?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch books');

      const data = await response.json();
      setBooks(data.books.map((b: Book) => ({ ...b, _id: b._id?.toString() })));
      setPagination((prev) => ({ ...prev, total: data.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch books');
      message.error('Failed to load books');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBook = () => {
    setEditingBook(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEditBook = (book: Book) => {
    setEditingBook(book);
    form.setFieldsValue({
      ...book,
      keywords: book.keywords?.join(', '),
    });
    setIsModalVisible(true);
  };

  const handleDeleteBook = async (id: string) => {
    try {
      const response = await fetch(`/api/books/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete book');
      }
      setBooks((prev) => prev.filter((b) => b._id !== id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      message.success('Book deleted successfully!');
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : 'Failed to delete book'
      );
    }
  };

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      const payload = {
        ...values,
        totalCopies: Number(values.totalCopies),
        availableCopies: editingBook
          ? Number(values.availableCopies)
          : Number(values.totalCopies),
        keywords: values.keywords
          ? values.keywords.split(',').map((k: string) => k.trim())
          : [],
      };

      const response = editingBook
        ? await fetch(`/api/books/${editingBook._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/books', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });

      if (response.ok) {
        message.success(
          editingBook
            ? 'Book updated successfully!'
            : 'Book added successfully!'
        );
        setIsModalVisible(false);
        fetchBooks();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Operation failed');
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Operation failed');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
  };

  const columns: ColumnsType<Book> = [
    {
      title: 'Database ID',
      dataIndex: '_id',
      key: '_id',
      render: (_id: string) => (
        <div className='flex items-center gap-1'>
          <Tag color='geekblue' className='font-mono truncate max-w-[120px]'>
            {_id}
          </Tag>
          <Tooltip title='Copy ID'>
            <Button
              type='text'
              icon={<CopyOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(_id);
              }}
              size='small'
            />
          </Tooltip>
        </div>
      ),
      fixed: 'left',
      width: 200,
    },
    {
      title: 'Book ID',
      dataIndex: 'bookId',
      key: 'bookId',
      sorter: (a, b) => a.bookId.localeCompare(b.bookId),
      render: (bookId: string) => (
        <Tag color='blue' className='font-mono'>
          {bookId}
        </Tag>
      ),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a, b) => a.title.localeCompare(b.title),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
      sorter: (a, b) => a.author.localeCompare(b.author),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: BookCategory) => (
        <Tag color={categoryColors[category]} className='capitalize'>
          {category}
        </Tag>
      ),
      sorter: (a, b) => a.category.localeCompare(b.category),
      filters: bookCategories.map((category) => ({
        text: category,
        value: category,
      })),
      onFilter: (value, record) => record.category === value,
    },
    {
      title: 'ISBN',
      dataIndex: 'isbn',
      key: 'isbn',
      render: (isbn: string) => (
        <div className='flex items-center gap-1'>
          <span>{isbn}</span>
          <Tooltip title='Copy ISBN'>
            <Button
              type='text'
              icon={<CopyOutlined />}
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(isbn);
              }}
              size='small'
            />
          </Tooltip>
        </div>
      ),
    },
    {
      title: 'Copies',
      key: 'copies',
      render: (_: any, record: Book) => (
        <div className='flex gap-2'>
          <Tooltip title='Total Copies'>
            <Badge
              count={record.totalCopies}
              style={{ backgroundColor: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title='Available Copies'>
            <Badge
              count={record.availableCopies}
              style={{
                backgroundColor:
                  record.availableCopies > 0 ? '#52c41a' : '#ff4d4f',
              }}
            />
          </Tooltip>
        </div>
      ),
      sorter: (a, b) => a.availableCopies - b.availableCopies,
    },
    {
      title: 'Shelf Location',
      dataIndex: 'shelfLocation',
      key: 'shelfLocation',
      render: (location: string) => (
        <Tag color='geekblue' className='font-mono'>
          {location}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_: any, record: Book) => (
        <Space size='middle'>
          {session?.user?.permissions?.includes(PERMISSIONS.BOOKS_UPDATE) && (
            <Tooltip title='Edit'>
              <Button
                type='text'
                icon={<EditOutlined />}
                onClick={() => handleEditBook(record)}
                className='text-blue-500 hover:text-blue-700'
              />
            </Tooltip>
          )}
          {session?.user?.permissions?.includes(PERMISSIONS.BOOKS_DELETE) && (
            <Tooltip title='Delete'>
              <Popconfirm
                title={`Delete book ${record.title}?`}
                description={`This will permanently delete ${record.title} (ID: ${record._id})`}
                onConfirm={(e) => {
                  e?.stopPropagation();
                  handleDeleteBook(record._id!);
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText='Yes'
                cancelText='No'
                placement='left'
              >
                <Button
                  type='text'
                  icon={<DeleteOutlined />}
                  className='text-red-500 hover:text-red-700'
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

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

  const canReadBooks =
    session?.user?.permissions?.includes(PERMISSIONS.BOOKS_READ) || false;
  const canCreateBooks =
    session?.user?.permissions?.includes(PERMISSIONS.BOOKS_CREATE) || false;

  if (!canReadBooks) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='Book Management' />
          <Content className='p-4 md:p-6'>
            <Card className='rounded-lg shadow-sm border-0'>
              <Empty
                image={<BookOutlined className='text-5xl text-gray-300' />}
                description={
                  <div className='space-y-2'>
                    <Title level={4} className='text-gray-600 m-0'>
                      Access Restricted
                    </Title>
                    <Text type='secondary'>
                      You don't have permission to view book information
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
        <Header title='Book Management' />
        <Content className='p-4 md:p-6'>
          <Card
            className='rounded-lg shadow-sm border-0'
            bodyStyle={{ padding: 0 }}
          >
            <div className='p-4 border-b border-gray-200'>
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
                <div className='flex items-center gap-2'>
                  <BookOutlined className='text-blue-500 text-xl' />
                  <Title level={4} className='m-0'>
                    Books
                  </Title>
                </div>
                <div className='flex flex-col sm:flex-row gap-3'>
                  <Input
                    placeholder='Search books...'
                    prefix={<SearchOutlined />}
                    allowClear
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='w-full sm:w-64'
                  />
                  {canCreateBooks && (
                    <Button
                      type='primary'
                      icon={<PlusOutlined />}
                      onClick={handleAddBook}
                      className='w-full sm:w-auto'
                    >
                      Add Book
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {error ? (
              <Alert
                message='Error Loading Books'
                description={error}
                type='error'
                showIcon
                className='m-4'
              />
            ) : loading ? (
              <div className='text-center py-8'>
                <Spin size='large' tip='Loading books...' />
              </div>
            ) : books.length === 0 ? (
              <Empty
                description={
                  <div className='space-y-2'>
                    <Text strong>No books found</Text>
                    <Text type='secondary'>
                      {searchQuery
                        ? 'Try a different search term'
                        : 'Add a new book to get started'}
                    </Text>
                  </div>
                }
                className='py-8'
              >
                {canCreateBooks && (
                  <Button
                    type='primary'
                    icon={<PlusOutlined />}
                    onClick={handleAddBook}
                  >
                    Add Book
                  </Button>
                )}
              </Empty>
            ) : (
              <Table
                columns={columns}
                dataSource={books}
                loading={loading}
                rowKey='_id'
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} books`,
                  onChange: (page, pageSize) => {
                    setPagination({
                      current: page.current || 1,
                      pageSize: page.pageSize || 10,
                      total: pagination.total,
                    });
                  },
                }}
                scroll={{ x: 'max-content' }}
                className='w-full'
                onRow={(record) => ({
                  onClick: () => handleEditBook(record),
                  style: { cursor: 'pointer' },
                })}
              />
            )}
          </Card>

          <Modal
            title={
              <div className='flex items-center gap-2'>
                <BookOutlined className='text-blue-500' />
                {editingBook
                  ? `Edit Book (ID: ${editingBook._id})`
                  : 'Add New Book'}
              </div>
            }
            open={isModalVisible}
            onOk={handleModalOk}
            onCancel={() => setIsModalVisible(false)}
            confirmLoading={loading}
            width={600}
            destroyOnClose
          >
            <Form form={form} layout='vertical' className='mt-4'>
              {editingBook && (
                <Form.Item label='Database ID'>
                  <div className='flex items-center gap-2'>
                    <Input value={editingBook._id} disabled />
                    <Tooltip title='Copy ID'>
                      <Button
                        icon={<CopyOutlined />}
                        onClick={() => copyToClipboard(editingBook._id!)}
                      />
                    </Tooltip>
                  </div>
                </Form.Item>
              )}
              <Form.Item
                name='bookId'
                label='Book ID'
                rules={[
                  { required: true, message: 'Please input the Book ID!' },
                  {
                    pattern: /^[A-Za-z0-9-]+$/,
                    message: 'Only letters, numbers and hyphens allowed',
                  },
                ]}
              >
                <Input disabled={!!editingBook} placeholder='e.g., BK-001' />
              </Form.Item>
              <Form.Item
                name='title'
                label='Title'
                rules={[
                  { required: true, message: 'Please input the title!' },
                  { min: 2, message: 'Title must be at least 2 characters' },
                ]}
              >
                <Input placeholder='Book Title' />
              </Form.Item>
              <Form.Item
                name='author'
                label='Author'
                rules={[
                  { required: true, message: 'Please input the author!' },
                  { min: 2, message: 'Author must be at least 2 characters' },
                ]}
              >
                <Input placeholder='Author Name' />
              </Form.Item>
              <Form.Item
                name='category'
                label='Category'
                rules={[
                  { required: true, message: 'Please select a category!' },
                ]}
              >
                <Select placeholder='Select a category'>
                  {bookCategories.map((category) => (
                    <Option key={category} value={category}>
                      {category}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item
                name='isbn'
                label='ISBN'
                rules={[
                  {
                    pattern: /^[0-9-]+$/,
                    message: 'Only numbers and hyphens allowed',
                  },
                ]}
              >
                <Input placeholder='e.g., 978-3-16-148410-0' />
              </Form.Item>
              <Form.Item
                name='totalCopies'
                label='Total Copies'
                rules={[
                  { required: true, message: 'Please input total copies!' },
                  // { type: 'number', min: 1, message: 'Must be at least 1' },
                ]}
              >
                <Input type='number' min={1} />
              </Form.Item>
              {editingBook && (
                <Form.Item
                  name='availableCopies'
                  label='Available Copies'
                  rules={[
                    {
                      required: true,
                      message: 'Please input available copies!',
                    },
                    {
                      type: 'number',
                      min: 0,
                      max: form.getFieldValue('totalCopies'),
                      message: `Must be between 0 and ${form.getFieldValue(
                        'totalCopies'
                      )}`,
                    },
                  ]}
                >
                  <Input type='number' />
                </Form.Item>
              )}
              <Form.Item
                name='shelfLocation'
                label='Shelf Location'
                rules={[
                  {
                    required: true,
                    message: 'Please input the shelf location!',
                  },
                ]}
              >
                <Input placeholder='e.g., A12-B3' />
              </Form.Item>
              <Form.Item name='keywords' label='Keywords (comma-separated)'>
                <Input.TextArea
                  rows={2}
                  placeholder='e.g., contract, tort, criminal'
                />
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}

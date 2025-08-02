/** @format */

'use client';

import { useState, useEffect } from 'react';
import {
  Layout,
  Table,
  Input,
  Select,
  Card,
  Typography,
  Row,
  Col,
  Spin,
  Alert,
  Tag,
  Empty,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import type { Book, Borrower } from '@/lib/models';
import { PERMISSIONS } from '@/lib/auth';

const { Content } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;

type SearchType = 'books' | 'borrowers';
export const dynamic = 'force-dynamic';
export default function SearchFilterPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [searchType, setSearchType] = useState<SearchType>('books');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<(Book | Borrower)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const bookCategories = [
    'Textbook',
    'Statute',
    'Law Report',
    'Case Law',
    'Journal',
    'Reference',
  ];

  const borrowerRoles = ['Intern', 'Lawyer', 'Staff', 'Partner', 'Associate'];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      setSearchResults([]);
      setPagination({ current: 1, pageSize: 10, total: 0 });
    }
  }, [status, router, searchType]);

  const handleSearch = async (value: string, page = 1, pageSize = 10) => {
    setSearchQuery(value);
    if (!value.trim()) {
      setSearchResults([]);
      setPagination((prev) => ({ ...prev, total: 0 }));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const endpoint = searchType === 'books' ? '/api/books' : '/api/borrowers';
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
        search: value,
      });

      const response = await fetch(`${endpoint}?${params.toString()}`);
      if (!response.ok) throw new Error(`Failed to fetch ${searchType}`);
      const data = await response.json();

      const results = data[searchType].map((item: Book | Borrower) => ({
        ...item,
        _id: item._id?.toString(),
      }));

      setSearchResults(results);
      setPagination({
        current: page,
        pageSize,
        total: data.total,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred during search'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination: any) => {
    setPagination(newPagination);
    handleSearch(searchQuery, newPagination.current, newPagination.pageSize);
  };

  const bookColumns = [
    {
      title: 'Book ID',
      dataIndex: 'bookId',
      key: 'bookId',
      sorter: (a: Book, b: Book) => a.bookId.localeCompare(b.bookId),
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a: Book, b: Book) => a.title.localeCompare(b.title),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Author',
      dataIndex: 'author',
      key: 'author',
      sorter: (a: Book, b: Book) => a.author.localeCompare(b.author),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (category: string) => (
        <Tag color='blue' className='capitalize'>
          {category}
        </Tag>
      ),
      filters: bookCategories.map((cat) => ({ text: cat, value: cat })),
      onFilter: (value: string, record: Book) => record.category === value,
    },
    {
      title: 'ISBN',
      dataIndex: 'isbn',
      key: 'isbn',
    },
    {
      title: 'Available Copies',
      dataIndex: 'availableCopies',
      key: 'availableCopies',
      sorter: (a: Book, b: Book) => a.availableCopies - b.availableCopies,
      render: (availableCopies: number) => (
        <Tag color={availableCopies > 0 ? 'green' : 'red'}>
          {availableCopies}
        </Tag>
      ),
    },
    {
      title: 'Shelf Location',
      dataIndex: 'shelfLocation',
      key: 'shelfLocation',
    },
  ];

  const borrowerColumns = [
    {
      title: 'Member ID',
      dataIndex: 'memberId',
      key: 'memberId',
      sorter: (a: Borrower, b: Borrower) =>
        a.memberId.localeCompare(b.memberId),
      render: (memberId: string) => <Tag color='geekblue'>{memberId}</Tag>,
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: Borrower, b: Borrower) => a.name.localeCompare(b.name),
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color='blue' className='capitalize'>
          {role}
        </Tag>
      ),
      filters: borrowerRoles.map((role) => ({ text: role, value: role })),
      onFilter: (value: string, record: Borrower) => record.role === value,
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
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
  const canReadBorrowers =
    session?.user?.permissions?.includes(PERMISSIONS.BORROWERS_READ) || false;

  if (!canReadBooks && !canReadBorrowers) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='Search & Filter' />
          <Content className='p-4 md:p-6'>
            <Card className='rounded-lg shadow-sm border-0'>
              <Empty
                image={<SearchOutlined className='text-5xl text-gray-300' />}
                description={
                  <div className='space-y-2'>
                    <Title level={4} className='text-gray-600 m-0'>
                      Access Restricted
                    </Title>
                    <Text type='secondary'>
                      You don't have permission to perform searches
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
        <Header title='Search & Filter' />
        <Content className='p-4 md:p-6'>
          <Card className='rounded-lg shadow-sm border-0'>
            <div className='mb-6'>
              <div className='flex items-center gap-2 mb-2'>
                <SearchOutlined className='text-blue-500 text-xl' />
                <Title level={4} className='m-0'>
                  Search & Filter
                </Title>
              </div>
              <Text type='secondary'>Find books or borrowers quickly</Text>
            </div>

            <Row gutter={[16, 16]} className='mb-6'>
              <Col xs={24} sm={8} md={6}>
                <Select
                  value={searchType}
                  onChange={(value) => {
                    setSearchType(value as SearchType);
                    setSearchResults([]);
                    setSearchQuery('');
                    setPagination({ current: 1, pageSize: 10, total: 0 });
                  }}
                  className='w-full'
                >
                  {canReadBooks && <Option value='books'>Books</Option>}
                  {canReadBorrowers && (
                    <Option value='borrowers'>Borrowers</Option>
                  )}
                </Select>
              </Col>
              <Col xs={24} sm={16} md={18}>
                <Input.Search
                  placeholder={
                    searchType === 'books'
                      ? 'Search by title, author, ISBN...'
                      : 'Search by name, email, member ID...'
                  }
                  onSearch={(value) =>
                    handleSearch(value, 1, pagination.pageSize)
                  }
                  enterButton
                  allowClear
                  loading={loading}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full'
                />
              </Col>
            </Row>

            {error && (
              <Alert
                message='Error'
                description={error}
                type='error'
                showIcon
                className='mb-4'
              />
            )}

            {loading && searchResults.length === 0 ? (
              <div className='text-center py-8'>
                <Spin size='large' tip='Searching...' />
              </div>
            ) : searchResults.length === 0 && searchQuery ? (
              <Empty
                description={
                  <div className='space-y-2'>
                    <Text strong>No results found</Text>
                    <Text type='secondary'>Try a different search term</Text>
                  </div>
                }
                className='py-8'
              />
            ) : (
              <Table
                columns={searchType === 'books' ? bookColumns : borrowerColumns}
                dataSource={searchResults}
                loading={loading}
                rowKey='_id'
                pagination={{
                  ...pagination,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} of ${total} ${searchType}`,
                }}
                onChange={handleTableChange}
                scroll={{ x: 'max-content' }}
                className='w-full'
              />
            )}
          </Card>
        </Content>
      </Layout>
    </Layout>
  );
}

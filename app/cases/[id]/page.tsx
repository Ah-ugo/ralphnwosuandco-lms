/** @format */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Layout,
  Table,
  Button,
  Input,
  Select,
  Space,
  Modal,
  Form,
  message,
  Popconfirm,
  Tag,
  Row,
  Col,
  Typography,
  Spin,
  Card,
  Empty,
  Descriptions,
  type DescriptionsProps,
  Upload,
  Steps,
  DatePicker,
  Divider,
  Alert,
  Tabs,
  Badge,
} from 'antd';
import {
  FolderOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FileTextOutlined,
  MailOutlined,
  LinkOutlined,
  UploadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SignatureOutlined,
  NotificationOutlined,
} from '@ant-design/icons';
import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';
import type { Case, Document, User } from '@/lib/models';
import dayjs from 'dayjs';
import type { ColumnsType } from 'antd/es/table';
import { PERMISSIONS } from '@/lib/auth';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import DocumentEditor from '@/components/documentEditor';
import SignaturePad from '@/components/SignaturePad';

const { Content } = Layout;
const { Option } = Select;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Step } = Steps;
const { TabPane } = Tabs;

type DocumentType = 'text' | 'pdf' | 'image' | 'word' | 'other';

export default function CaseDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  const { id: caseId } = params;
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentCase, setCurrentCase] = useState<Case | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingCase, setLoadingCase] = useState(true);
  const [loadingDocuments, setLoadingDocuments] = useState(true);
  const [caseModalVisible, setCaseModalVisible] = useState(false);
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [isEditingDocument, setIsEditingDocument] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
  const [sendEmailModalVisible, setSendEmailModalVisible] = useState(false);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [selectedDocumentForEmail, setSelectedDocumentForEmail] = useState<
    string | null
  >(null);
  const [selectedDocumentForSignature, setSelectedDocumentForSignature] =
    useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [activeTab, setActiveTab] = useState('documents');
  const [signature, setSignature] = useState<string | null>(null);
  const [signatureLoading, setSignatureLoading] = useState(false);

  const [caseForm] = Form.useForm();
  const [documentForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [reminderForm] = Form.useForm();

  const documentTypes: DocumentType[] = [
    'text',
    'pdf',
    'image',
    'word',
    'other',
  ];
  const caseStatuses: Case['status'][] = [
    'Open',
    'Closed',
    'Pending',
    'Archived',
  ];

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    } else if (status === 'authenticated') {
      fetchCaseDetails();
      fetchDocuments();
      fetchUsers();
    }
  }, [status, router, caseId]);

  const fetchCaseDetails = async () => {
    setLoadingCase(true);
    try {
      const response = await fetch(`/api/cases/${caseId}`);
      const data = await response.json();
      if (response.ok) {
        setCurrentCase(data);
      } else {
        message.error(data.error || 'Failed to fetch case details');
        router.push('/cases');
      }
    } catch (error) {
      message.error('Failed to fetch case details');
      router.push('/cases');
    } finally {
      setLoadingCase(false);
    }
  };

  const fetchDocuments = async () => {
    setLoadingDocuments(true);
    try {
      const response = await fetch(`/api/documents/case/${caseId}`);
      const data = await response.json();
      if (response.ok) {
        setDocuments(data);
      } else {
        message.error(data.error || 'Failed to fetch documents');
      }
    } catch (error) {
      message.error('Failed to fetch documents');
    } finally {
      setLoadingDocuments(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      if (response.ok) {
        setUsers(
          data.users.map((u: User) => ({ ...u, _id: u._id?.toString() }))
        );
      } else {
        message.error(data.error || 'Failed to fetch users');
      }
    } catch (error) {
      message.error('Failed to fetch users');
    }
  };

  const handleEditCaseDetails = () => {
    if (currentCase) {
      caseForm.setFieldsValue({
        ...currentCase,
        assignedTo: currentCase.assignedTo?.toString(),
      });
      setCaseModalVisible(true);
    }
  };

  const handleCaseFormSubmit = async (values: any) => {
    try {
      const response = await fetch(`/api/cases/${caseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        message.success('Case details updated successfully!');
        setCaseModalVisible(false);
        fetchCaseDetails();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update case details');
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to update case details'
      );
    }
  };

  const handleAddDocument = () => {
    setIsEditingDocument(false);
    setCurrentDocument(null);
    documentForm.resetFields();
    setFileList([]);
    setDocumentModalVisible(true);
  };

  const handleEditDocument = (record: Document) => {
    setIsEditingDocument(true);
    setCurrentDocument(record);
    documentForm.setFieldsValue(record);
    if (record.fileUrl) {
      setFileList([
        {
          uid: record._id as string,
          name: record.title,
          status: 'done',
          url: record.fileUrl,
          thumbUrl: record.fileUrl,
        },
      ]);
    } else {
      setFileList([]);
    }
    setDocumentModalVisible(true);
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        message.success('Document deleted successfully!');
        fetchDocuments();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to delete document'
      );
    }
  };

  const handleDocumentFormSubmit = async (values: any) => {
    try {
      const formData = new FormData();
      formData.append('caseId', caseId);
      formData.append('title', values.title);
      formData.append('content', values.content);
      formData.append('type', values.type);

      if (fileList.length > 0) {
        const file = fileList[0];
        console.log('[v0] File details:', {
          name: file.name,
          hasOriginFileObj: !!file.originFileObj,
          fileSize: file.originFileObj?.size,
          fileType: file.originFileObj?.type,
        });

        if (file.originFileObj) {
          formData.append('file', file.originFileObj);
          console.log('[v0] Successfully added file to FormData');
        } else {
          console.log('[v0] Warning: No originFileObj found');
        }
      } else {
        console.log('[v0] No files in fileList');
      }

      const url = isEditingDocument
        ? `/api/documents/${currentDocument?._id}`
        : '/api/documents';
      const method = isEditingDocument ? 'PUT' : 'POST';

      console.log('[v0] Submitting document form:', {
        url,
        method,
        hasFile: fileList.length > 0,
      });

      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (response.ok) {
        message.success(
          `Document ${isEditingDocument ? 'updated' : 'created'} successfully!`
        );
        setDocumentModalVisible(false);
        setFileList([]);
        fetchDocuments();
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to ${isEditingDocument ? 'update' : 'create'} document`
        );
      }
    } catch (error) {
      console.error('[v0] Document form submission error:', error);
      message.error(
        error instanceof Error
          ? error.message
          : `Failed to ${isEditingDocument ? 'update' : 'create'} document`
      );
    }
  };

  const handleSendDocumentEmail = (documentId: string) => {
    setSelectedDocumentForEmail(documentId);
    emailForm.resetFields();
    setSendEmailModalVisible(true);
  };

  const handleEmailSendSubmit = async (values: { recipientEmail: string }) => {
    if (!selectedDocumentForEmail) return;

    try {
      const response = await fetch('/api/documents/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: selectedDocumentForEmail,
          recipientEmail: values.recipientEmail,
        }),
      });

      if (response.ok) {
        message.success('Document sent via email successfully!');
        setSendEmailModalVisible(false);
        setSelectedDocumentForEmail(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send document email');
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to send document email'
      );
    }
  };

  const handleAddSignature = (documentId: string) => {
    setSelectedDocumentForSignature(documentId);
    setSignatureModalVisible(true);
  };

  const handleSaveSignature = async () => {
    if (!selectedDocumentForSignature || !signature) return;

    setSignatureLoading(true);
    try {
      const response = await fetch(
        `/api/documents/${selectedDocumentForSignature}/sign`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signature,
            signedBy: session?.user?.name || 'Unknown',
            signedAt: new Date().toISOString(),
          }),
        }
      );

      if (response.ok) {
        message.success('Signature added to document successfully!');
        setSignatureModalVisible(false);
        setSignature(null);
        fetchDocuments();
      } else {
        throw new Error('Failed to save signature');
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to save signature'
      );
    } finally {
      setSignatureLoading(false);
    }
  };

  const handleSetReminder = () => {
    reminderForm.resetFields();
    setReminderModalVisible(true);
  };

  const handleReminderSubmit = async (values: {
    date: Date;
    message: string;
  }) => {
    try {
      const response = await fetch('/api/cases/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId,
          dueDate: values.date,
          message: values.message,
          assignedTo: currentCase?.assignedTo,
        }),
      });

      if (response.ok) {
        message.success('Reminder set successfully!');
        setReminderModalVisible(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to set reminder');
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to set reminder'
      );
    }
  };

  const getStatusTag = (status: string) => {
    let color = 'blue';
    switch (status) {
      case 'Open':
        color = 'green';
        break;
      case 'Closed':
        color = 'red';
        break;
      case 'Pending':
        color = 'orange';
        break;
      case 'Archived':
        color = 'default';
        break;
      default:
        color = 'blue';
    }
    return <Tag color={color}>{status}</Tag>;
  };

  const caseDetailsItems: DescriptionsProps['items'] = currentCase
    ? [
        { key: '1', label: 'Case ID', children: currentCase.caseId },
        { key: '2', label: 'Title', children: currentCase.title },
        { key: '3', label: 'Client Name', children: currentCase.clientName },
        {
          key: '4',
          label: 'Status',
          children: getStatusTag(currentCase.status),
        },
        {
          key: '5',
          label: 'Assigned To',
          children: currentCase.assignedUser?.name || 'Unassigned',
        },
        {
          key: '6',
          label: 'Created At',
          children: dayjs(currentCase.createdAt).format('MMM D, YYYY HH:mm'),
        },
        {
          key: '7',
          label: 'Last Updated',
          children: dayjs(currentCase.updatedAt).format('MMM D, YYYY HH:mm'),
        },
        {
          key: '8',
          label: 'Description',
          children: currentCase.description || 'N/A',
          span: { xs: 1, sm: 2, md: 3 },
        },
      ]
    : [];

  const documentColumns: ColumnsType<Document> = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      sorter: (a, b) => a.title.localeCompare(b.title),
      render: (text, record) => (
        <div className='flex items-center gap-2'>
          <span>{text}</span>
          {record.signature && (
            <Badge count={<SignatureOutlined style={{ color: '#52c41a' }} />} />
          )}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color='geekblue' className='capitalize'>
          {type}
        </Tag>
      ),
      filters: documentTypes.map((type) => ({
        text: type.charAt(0).toUpperCase() + type.slice(1),
        value: type,
      })),
      onFilter: (value, record) => record.type === value,
    },
    {
      title: 'File',
      dataIndex: 'fileUrl',
      key: 'fileUrl',
      render: (url: string) =>
        url ? (
          <a href={url} target='_blank' rel='noopener noreferrer'>
            <LinkOutlined /> View File
          </a>
        ) : (
          'No File'
        ),
    },
    {
      title: 'Created At',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('MMM D, YYYY'),
      sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (record: Document) => (
        <Space size='middle'>
          {canUpdateDocuments && (
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEditDocument(record)}
              aria-label={`Edit ${record.title}`}
            />
          )}
          {canDeleteDocuments && (
            <Popconfirm
              title='Confirm Delete'
              description='Are you sure you want to delete this document?'
              onConfirm={() => handleDeleteDocument(record._id as string)}
              okText='Yes'
              cancelText='No'
              placement='left'
            >
              <Button
                icon={<DeleteOutlined />}
                danger
                aria-label={`Delete ${record.title}`}
              />
            </Popconfirm>
          )}
          {canReadDocuments && (
            <Button
              icon={<MailOutlined />}
              onClick={() => handleSendDocumentEmail(record._id as string)}
              aria-label={`Email ${record.title}`}
            />
          )}
          {canUpdateDocuments && (
            <Button
              icon={<SignatureOutlined />}
              onClick={() => handleAddSignature(record._id as string)}
              aria-label={`Sign ${record.title}`}
            />
          )}
        </Space>
      ),
    },
  ];

  const uploadProps: UploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      // Validate file size (max 10MB)
      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('File must be smaller than 10MB!');
        return Upload.LIST_IGNORE;
      }

      const uploadFile: UploadFile = {
        uid: file.uid || Date.now().toString(),
        name: file.name,
        status: 'done',
        originFileObj: file,
        size: file.size,
        type: file.type,
      };

      setFileList([uploadFile]);
      console.log('[v0] File stored in fileList:', {
        name: file.name,
        size: file.size,
        hasOriginFileObj: !!file,
      });
      return false;
    },
    fileList,
    maxCount: 1,
    accept: '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png',
  };

  if (status === 'loading' || loadingCase) {
    return (
      <div className='min-h-screen flex justify-center items-center'>
        <Spin size='large' tip='Loading...' />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const canReadCases =
    session?.user?.permissions?.includes(PERMISSIONS.CASES_READ) || false;
  const canUpdateCases =
    session?.user?.permissions?.includes(PERMISSIONS.CASES_UPDATE) || false;
  const canReadDocuments =
    session?.user?.permissions?.includes(PERMISSIONS.DOCUMENTS_READ) || false;
  const canCreateDocuments =
    session?.user?.permissions?.includes(PERMISSIONS.DOCUMENTS_CREATE) || false;
  const canUpdateDocuments =
    session?.user?.permissions?.includes(PERMISSIONS.DOCUMENTS_UPDATE) || false;
  const canDeleteDocuments =
    session?.user?.permissions?.includes(PERMISSIONS.DOCUMENTS_DELETE) || false;

  if (!canReadCases || !currentCase) {
    return (
      <Layout className='min-h-screen bg-gray-50'>
        <Sidebar />
        <Layout className='ml-0 lg:ml-[250px] transition-all'>
          <Header title='Case Details' />
          <Content className='p-4 md:p-6'>
            <Card className='rounded-lg shadow-sm border-0'>
              <Empty
                image={<FolderOutlined className='text-5xl text-gray-300' />}
                description={
                  <div className='space-y-2'>
                    <Title level={4} className='text-gray-600 m-0'>
                      Access Restricted or Case Not Found
                    </Title>
                    <Text type='secondary'>
                      You don't have permission to view this case or it does not
                      exist.
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
        <Header title={`Case: ${currentCase.title}`} />
        <Content className='p-4 md:p-6'>
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Card
                className='rounded-lg shadow-sm border-0'
                title={
                  <div className='flex items-center gap-2'>
                    <FolderOutlined className='text-blue-500 text-xl' />
                    <Title level={4} className='m-0'>
                      Case Details
                    </Title>
                  </div>
                }
                extra={
                  <Space>
                    {canUpdateCases && (
                      <Button
                        icon={<EditOutlined />}
                        onClick={handleEditCaseDetails}
                      >
                        Edit Case
                      </Button>
                    )}
                    {currentCase.status === 'Open' && (
                      <Button
                        icon={<NotificationOutlined />}
                        onClick={handleSetReminder}
                      >
                        Set Reminder
                      </Button>
                    )}
                  </Space>
                }
              >
                <Descriptions
                  bordered
                  column={{ xs: 1, sm: 2, md: 3 }}
                  items={caseDetailsItems}
                />
              </Card>
            </Col>
            <Col xs={24}>
              <Card
                className='rounded-lg shadow-sm border-0'
                title={
                  <div className='flex items-center gap-2'>
                    <FileTextOutlined className='text-blue-500 text-xl' />
                    <Title level={4} className='m-0'>
                      Documents
                    </Title>
                  </div>
                }
                extra={
                  canCreateDocuments && (
                    <Button
                      type='primary'
                      icon={<PlusOutlined />}
                      onClick={handleAddDocument}
                    >
                      Add Document
                    </Button>
                  )
                }
              >
                <Tabs
                  activeKey={activeTab}
                  onChange={setActiveTab}
                  className='w-full'
                >
                  <TabPane tab='Documents' key='documents'>
                    <Table
                      columns={documentColumns}
                      dataSource={documents}
                      loading={loadingDocuments}
                      rowKey='_id'
                      pagination={{ pageSize: 5 }}
                      scroll={{ x: 'max-content' }}
                      className='w-full'
                      expandable={{
                        expandedRowRender: (record) => (
                          <div className='p-4 bg-gray-50 rounded-md'>
                            <Title level={5}>Document Content:</Title>
                            <div
                              dangerouslySetInnerHTML={{
                                __html: record.content,
                              }}
                            />
                            {record.signature && (
                              <div className='mt-4'>
                                <Divider orientation='left'>Signature</Divider>
                                <div className='flex items-center gap-4'>
                                  <img
                                    src={record.signature || '/placeholder.svg'}
                                    alt='Signature'
                                    className='h-20 border p-2 rounded'
                                  />
                                  <div>
                                    <p>Signed by: {record.signedBy}</p>
                                    <p>
                                      Signed at:{' '}
                                      {dayjs(record.signedAt).format(
                                        'MMM D, YYYY HH:mm'
                                      )}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ),
                        rowExpandable: (record) =>
                          record.content.length > 0 || !!record.signature,
                      }}
                    />
                  </TabPane>
                  <TabPane tab='Activity' key='activity'>
                    <Steps direction='vertical' current={1} className='mt-4'>
                      <Step
                        title='Case Created'
                        description={dayjs(currentCase.createdAt).format(
                          'MMM D, YYYY HH:mm'
                        )}
                        icon={
                          <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        }
                      />
                      {documents.map((doc) => (
                        <Step
                          key={doc._id}
                          title={`Document Added: ${doc.title}`}
                          description={dayjs(doc.createdAt).format(
                            'MMM D, YYYY HH:mm'
                          )}
                          icon={<FileTextOutlined />}
                        />
                      ))}
                    </Steps>
                  </TabPane>
                </Tabs>
              </Card>
            </Col>
          </Row>

          {/* Edit Case Modal */}
          <Modal
            title={
              <div className='flex items-center gap-2'>
                <FolderOutlined className='text-blue-500' /> Edit Case Details
              </div>
            }
            open={caseModalVisible}
            onCancel={() => {
              setCaseModalVisible(false);
              caseForm.resetFields();
            }}
            footer={null}
            destroyOnClose
            width={800}
          >
            <Form
              form={caseForm}
              layout='vertical'
              onFinish={handleCaseFormSubmit}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name='caseId' label='Case ID'>
                    <Input disabled />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name='status'
                    label='Status'
                    rules={[
                      { required: true, message: 'Please select a status' },
                    ]}
                  >
                    <Select placeholder='Select status'>
                      {caseStatuses.map((status) => (
                        <Option key={status} value={status}>
                          {status}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name='title'
                label='Title'
                rules={[{ required: true, message: 'Please enter a title' }]}
              >
                <Input />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name='clientName'
                    label='Client Name'
                    rules={[
                      { required: true, message: 'Please enter client name' },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name='assignedTo' label='Assigned To'>
                    <Select
                      placeholder='Select assigned user (optional)'
                      allowClear
                      showSearch
                      optionFilterProp='children'
                      filterOption={(input, option) =>
                        (option?.children as string)
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                    >
                      {users.map((user) => (
                        <Option key={user._id} value={user._id}>
                          {user.name} ({user.role})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name='description' label='Description'>
                <TextArea rows={4} />
              </Form.Item>

              <Form.Item>
                <Button type='primary' htmlType='submit' className='w-full'>
                  Update Case
                </Button>
              </Form.Item>
            </Form>
          </Modal>

          {/* Add/Edit Document Modal */}
          <Modal
            title={
              <div className='flex items-center gap-2'>
                <FileTextOutlined className='text-blue-500' />{' '}
                {isEditingDocument ? 'Edit Document' : 'New Document'}
              </div>
            }
            open={documentModalVisible}
            onCancel={() => {
              setDocumentModalVisible(false);
              documentForm.resetFields();
              setFileList([]);
            }}
            footer={null}
            destroyOnClose
            width={800}
          >
            <Form
              form={documentForm}
              layout='vertical'
              onFinish={handleDocumentFormSubmit}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name='title'
                    label='Document Title'
                    rules={[
                      {
                        required: true,
                        message: 'Please enter document title',
                      },
                    ]}
                  >
                    <Input placeholder='e.g., Client Meeting Notes' />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name='type'
                    label='Document Type'
                    rules={[
                      {
                        required: true,
                        message: 'Please select document type',
                      },
                    ]}
                  >
                    <Select placeholder='Select type'>
                      {documentTypes.map((type) => (
                        <Option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name='content'
                label='Content'
                rules={[
                  { required: true, message: 'Please enter document content' },
                ]}
              >
                <DocumentEditor />
              </Form.Item>

              <Form.Item label='Upload File (Optional)'>
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />}>Select File</Button>
                </Upload>
                <Text type='secondary'>
                  Supported formats: PDF, Word, Text, Images (JPG, PNG). Max
                  file size: 10MB.
                </Text>
              </Form.Item>

              <Form.Item>
                <Button type='primary' htmlType='submit' className='w-full'>
                  {isEditingDocument ? 'Update Document' : 'Create Document'}
                </Button>
              </Form.Item>
            </Form>
          </Modal>

          {/* Send Email Modal */}
          <Modal
            title={
              <div className='flex items-center gap-2'>
                <MailOutlined className='text-blue-500' /> Send Document via
                Email
              </div>
            }
            open={sendEmailModalVisible}
            onCancel={() => setSendEmailModalVisible(false)}
            footer={null}
            destroyOnClose
          >
            <Form
              form={emailForm}
              layout='vertical'
              onFinish={handleEmailSendSubmit}
            >
              <Form.Item
                name='recipientEmail'
                label='Recipient Email'
                rules={[
                  { required: true, message: 'Please enter recipient email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input placeholder='e.g., recipient@example.com' />
              </Form.Item>
              <Form.Item>
                <Button type='primary' htmlType='submit' className='w-full'>
                  Send Email
                </Button>
              </Form.Item>
            </Form>
          </Modal>

          {/* Signature Modal */}
          <Modal
            title={
              <div className='flex items-center gap-2'>
                <SignatureOutlined className='text-blue-500' /> Add Signature
              </div>
            }
            open={signatureModalVisible}
            onCancel={() => {
              setSignatureModalVisible(false);
              setSignature(null);
            }}
            okText='Save Signature'
            onOk={handleSaveSignature}
            confirmLoading={signatureLoading}
            width={600}
          >
            <div className='flex flex-col items-center'>
              <SignaturePad
                onSave={(sig) => setSignature(sig)}
                clearButtonText='Clear'
                saveButtonText='Save'
              />
              {signature && (
                <div className='mt-4'>
                  <Text strong>Signature Preview:</Text>
                  <img
                    src={signature || '/placeholder.svg'}
                    alt='Signature Preview'
                    className='h-20 border p-2 rounded mt-2'
                  />
                </div>
              )}
            </div>
          </Modal>

          {/* Reminder Modal */}
          <Modal
            title={
              <div className='flex items-center gap-2'>
                <ClockCircleOutlined className='text-blue-500' /> Set Case
                Reminder
              </div>
            }
            open={reminderModalVisible}
            onCancel={() => setReminderModalVisible(false)}
            footer={null}
            destroyOnClose
          >
            <Alert
              message='This will send an email reminder to the assigned lawyer on the specified date.'
              type='info'
              showIcon
              className='mb-4'
            />
            <Form
              form={reminderForm}
              layout='vertical'
              onFinish={handleReminderSubmit}
            >
              <Form.Item
                name='date'
                label='Reminder Date'
                rules={[{ required: true, message: 'Please select a date' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  disabledDate={(current) =>
                    current && current < dayjs().startOf('day')
                  }
                />
              </Form.Item>
              <Form.Item
                name='message'
                label='Reminder Message'
                rules={[{ required: true, message: 'Please enter a message' }]}
              >
                <TextArea rows={4} placeholder='Enter reminder message...' />
              </Form.Item>
              <Form.Item>
                <Button type='primary' htmlType='submit' className='w-full'>
                  Set Reminder
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        </Content>
      </Layout>
    </Layout>
  );
}

/** @format */

import React from 'react';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

const DocumentEditor = ({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
}) => {
  const modules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean'],
    ],
  };

  return (
    <div className='h-64 mb-4'>
      <ReactQuill
        theme='snow'
        value={value || ''}
        onChange={onChange}
        modules={modules}
        placeholder='Enter document content here...'
      />
    </div>
  );
};

export default DocumentEditor;

/** @format */

import React, { useRef, useState, useEffect } from 'react';
import { Button, Space } from 'antd';

const SignaturePad = ({
  onSave,
  clearButtonText = 'Clear',
  saveButtonText = 'Save',
  width = 500,
  height = 200,
}: {
  onSave: (signature: string) => void;
  clearButtonText?: string;
  saveButtonText?: string;
  width?: number;
  height?: number;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up canvas styling
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#000000';
  }, []);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x =
      'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y =
      'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x =
      'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y =
      'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    saveSignature();
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureData(null);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    setSignatureData(dataUrl);
    onSave(dataUrl);
  };

  return (
    <div className='flex flex-col items-center'>
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className='border border-gray-300 rounded-md cursor-crosshair'
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      <Space className='mt-4'>
        <Button onClick={clearSignature}>{clearButtonText}</Button>
        <Button type='primary' onClick={saveSignature}>
          {saveButtonText}
        </Button>
      </Space>
    </div>
  );
};

export default SignaturePad;

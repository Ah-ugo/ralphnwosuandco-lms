/** @format */
export const dynamic = 'force-dynamic';
export const revalidate = 0;
import type React from 'react';
import './globals.css';
import './output.css';
import {
  Inter,
  Montserrat,
  Playfair,
  Playfair_Display,
} from 'next/font/google';
import { ConfigProvider } from 'antd';
import SessionProvider from '@/components/providers/session-provider';

const inter = Inter({ subsets: ['latin'] });

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
  display: 'swap', // Optional: ensures text remains visible during webfont load
});

// Define Playfair for headers
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap', // Optional: ensures text remains visible during webfont load
});

export const metadata = {
  title: 'Ralph Nwosu & Co. Library Management System',
  description: 'A comprehensive library management system for law firms.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className={`${montserrat.variable} ${playfair.variable}`}>
      <body className='font-montserrat'>
        <SessionProvider>
          <ConfigProvider
            theme={{
              token: {
                colorPrimary: '#1890ff', // Ant Design primary blue
                colorSuccess: '#52c41a', // Ant Design success green
                colorWarning: '#faad14', // Ant Design warning yellow
                colorError: '#ff4d4f', // Ant Design error red
                colorInfo: '#1890ff', // Ant Design info blue
                colorTextBase: '#2d3748', // Dark gray for general text
                colorTextSecondary: '#4a5568', // Medium gray for secondary text
                colorBgContainer: '#ffffff', // White for card backgrounds
                colorBorderSecondary: '#e5e7eb', // Light gray for borders
                fontFamily: 'var(--font-montserrat), sans-serif',
              },
              components: {
                Layout: {
                  headerBg: '#ffffff',
                  siderBg: '#1f2937',
                },
                Menu: {
                  darkItemBg: '#1f2937',
                  darkItemSelectedBg: '#1890ff',
                  darkItemHoverBg: '#002140',
                  darkSubMenuItemBg: '#1f2937',
                },
                Table: {
                  headerBg: '#f7f7f7',
                  headerColor: '#595959',
                  rowHoverBg: '#e6f7ff',
                },
                Card: {
                  headerBg: '#f7f7f7',
                  extraColor: '#4a5568',
                },
                Button: {
                  colorPrimary: '#1890ff',
                  colorPrimaryHover: '#40a9ff',
                  colorPrimaryActive: '#096dd9',
                },
                Statistic: {
                  contentFontSize: 30,
                },
                Modal: {
                  headerBg: '#f7f7f7',
                  footerBg: '#f7f7f7',
                },
              },
            }}
          >
            {children}
          </ConfigProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

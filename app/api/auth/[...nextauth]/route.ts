/** @format */

import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { getDatabase } from '@/lib/mongodb';
import { compare } from 'bcryptjs';
import type { User } from '@/lib/models';
import {
  DEFAULT_USER_PERMISSIONS,
  ADMIN_PERMISSIONS,
  SUPER_ADMIN_PERMISSIONS,
} from '@/lib/auth';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          return null;
        }

        const db = await getDatabase();
        const user = await db
          .collection<User>('users')
          .findOne({ email: credentials.email });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await compare(credentials.password, user.password);

        if (!isValid) {
          return null;
        }

        let permissions: string[] = [];
        switch (user.role) {
          case 'Super Admin':
            permissions = SUPER_ADMIN_PERMISSIONS;
            break;
          case 'Admin':
            permissions = ADMIN_PERMISSIONS;
            break;
          case 'Librarian':
            permissions = [
              ...DEFAULT_USER_PERMISSIONS,
              'books:create',
              'books:update',
              'books:delete',
              'borrowers:create',
              'borrowers:update',
              'borrowers:delete',
              'lendings:create',
              'lendings:update',
              'notifications:create',
              'notifications:update',
            ];
            break;
          case 'User':
          default:
            permissions = DEFAULT_USER_PERMISSIONS;
            break;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: permissions,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60,
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
  },
  callbacks: {
    async jwt({ token, user }: { token: any; user: any }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.permissions = user.permissions;
      }
      console.log('JWT Token:', JSON.stringify(token, null, 2));
      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.permissions = token.permissions;
      }
      console.log('Session:', JSON.stringify(session, null, 2));

      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

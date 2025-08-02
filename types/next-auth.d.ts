/** @format */

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: 'User' | 'Librarian' | 'Admin' | 'Super Admin';
      permissions: string[];
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role: 'User' | 'Librarian' | 'Admin' | 'Super Admin';
    permissions: string[];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'User' | 'Librarian' | 'Admin' | 'Super Admin';
    permissions: string[];
  }
}

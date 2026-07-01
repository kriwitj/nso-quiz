import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import axios from 'axios';

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/login`, {
            email: credentials?.email,
            password: credentials?.password,
          });
          if (data.accessToken) {
            return {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name,
              image: data.user.avatar,
              role: data.user.role,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            };
          }
          return null;
        } catch {
          return null;
        }
      },
    }),
    // Used by the NSO SSO callback page after NestJS completes the OAuth2 flow
    CredentialsProvider({
      id: 'nso-token',
      name: 'NSO SSO Token',
      credentials: {
        token: { label: 'Access Token', type: 'text' },
        refresh: { label: 'Refresh Token', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.token) return null;
        try {
          const { data } = await axios.get(`${API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${credentials.token}` },
          });
          return {
            id: data.id,
            email: data.email,
            name: data.name,
            image: data.avatar ?? null,
            role: data.role,
            accessToken: credentials.token,
            refreshToken: credentials.refresh ?? '',
          };
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Ensure all NextAuth redirects respect the basePath.
      // NEXTAUTH_URL includes the basePath (e.g. https://host/nso-quiz),
      // so we use it as the authoritative base instead of the bare origin.
      const base = process.env.NEXTAUTH_URL ?? baseUrl;
      if (url.startsWith('/')) return `${base}${url}`;
      if (url.startsWith(base)) return url;
      return base;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
        token.role = (user as any).role;
        token.id = user.id;
      }
      if (account?.provider === 'google') {
        try {
          const { data } = await axios.get(
            `${process.env.GOOGLE_CALLBACK_URL?.replace('/callback', '')}` ||
              `${API_URL}/auth/google/callback`,
            { headers: { Authorization: `Bearer ${account.access_token}` } },
          );
          token.accessToken = data.accessToken;
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string;
      session.user.role = token.role as string;
      session.user.id = token.id as string;
      return session;
    },
  },
};

declare module 'next-auth' {
  interface Session {
    accessToken: string;
    user: {
      id: string;
      name: string;
      email: string;
      image?: string;
      role: string;
    };
  }
}

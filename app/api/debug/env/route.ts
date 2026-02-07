/**
 * Route pour vérifier les variables d'environnement (version sécurisée)
 * URL: /api/debug/env
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const databaseUrl = process.env.DATABASE_URL || '';

  // Masquer les credentials mais montrer le format
  const maskedUrl = databaseUrl
    .replace(/postgresql:\/\/([^:]+):([^@]+)@/, 'postgresql://***:***@')
    .replace(/\?.*$/, '?***'); // Masquer les query params aussi

  return NextResponse.json({
    env: {
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      databaseUrlFormat: maskedUrl,
      databaseUrlLength: databaseUrl.length,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
    node: {
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
    },
  });
}

export const dynamic = 'force-dynamic';

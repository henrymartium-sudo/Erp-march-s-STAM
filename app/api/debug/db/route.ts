/**
 * Test ultra-simple de connexion base de données
 * URL: /api/debug/db
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET() {
  try {
    // Test 1: Connexion Prisma
    await prisma.$connect();

    // Test 2: Compter les utilisateurs
    const userCount = await prisma.user.count();

    // Test 3: Lister les emails des utilisateurs de test
    const testUsers = await prisma.user.findMany({
      where: {
        email: {
          contains: '@erp-marches.local',
        },
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
      },
    });

    return NextResponse.json({
      success: true,
      database: 'connected',
      totalUsers: userCount,
      testUsers: testUsers,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
        databaseUrlPrefix: process.env.DATABASE_URL?.substring(0, 20) + '...',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export const dynamic = 'force-dynamic';

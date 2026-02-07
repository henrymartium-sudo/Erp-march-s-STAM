/**
 * API Route de diagnostic pour tester l'authentification
 * WARNING: À SUPPRIMER avant mise en production finale
 * URL: /api/debug/auth?email=admin@erp-marches.local&password=Admin123!
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get('email') || 'admin@erp-marches.local';
  const password = searchParams.get('password') || 'Admin123!';

  const results: any = {
    timestamp: new Date().toISOString(),
    email,
    steps: [],
  };

  try {
    // Étape 1: Test de connexion Prisma
    results.steps.push({
      step: 1,
      name: 'Connexion Prisma',
      status: 'testing',
    });

    await prisma.$connect();

    results.steps[0].status = 'success';
    results.steps[0].message = 'Connexion Prisma OK';

    // Étape 2: Recherche utilisateur
    results.steps.push({
      step: 2,
      name: 'Recherche utilisateur',
      status: 'testing',
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        password: true,
        createdAt: true,
      },
    });

    if (!user) {
      results.steps[1].status = 'error';
      results.steps[1].message = `Utilisateur ${email} non trouvé en base`;
      results.error = 'USER_NOT_FOUND';
      return NextResponse.json(results, { status: 404 });
    }

    results.steps[1].status = 'success';
    results.steps[1].message = 'Utilisateur trouvé';
    results.steps[1].data = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      passwordHashPrefix: user.password.substring(0, 20) + '...',
    };

    // Étape 3: Test bcrypt
    results.steps.push({
      step: 3,
      name: 'Comparaison bcrypt',
      status: 'testing',
    });

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      results.steps[2].status = 'error';
      results.steps[2].message = 'Mot de passe incorrect (bcrypt compare = false)';
      results.error = 'INVALID_PASSWORD';
      return NextResponse.json(results, { status: 401 });
    }

    results.steps[2].status = 'success';
    results.steps[2].message = 'Mot de passe valide (bcrypt compare = true)';

    // Étape 4: Test complet
    results.steps.push({
      step: 4,
      name: 'Authentification complète',
      status: 'success',
      message: 'Tous les tests passés - l\'authentification devrait fonctionner',
    });

    results.success = true;
    results.conclusion = 'L\'authentification fonctionne correctement. Si la connexion échoue sur /login, le problème vient de NextAuth.';

    return NextResponse.json(results, { status: 200 });

  } catch (error: any) {
    results.error = 'INTERNAL_ERROR';
    results.errorMessage = error.message;
    results.errorStack = error.stack;

    return NextResponse.json(results, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

export const dynamic = 'force-dynamic';

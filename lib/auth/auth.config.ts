import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
})

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        try {
          // Validation avec Zod
          const { email, password } = await loginSchema.parseAsync(credentials)

          // Recherche de l'utilisateur — email principal ou email secondaire (UserIdentifier)
          let user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) {
            const identifier = await prisma.userIdentifier.findUnique({
              where: { email },
              include: { user: true },
            })
            if (identifier) {
              user = identifier.user
            }
          }

          if (!user) {
            console.log('User not found:', email)
            await logAction({
              userEmail:  email,
              action:     AUDIT_ACTION.LOGIN_FAILED,
              entityType: AUDIT_ENTITY.AUTH,
              metadata:   { reason: 'user_not_found' },
            })
            return null
          }

          // Vérification du mot de passe
          const isValidPassword = await bcrypt.compare(password, user.password)

          if (!isValidPassword) {
            console.log('Invalid password for user:', email)
            await logAction({
              userEmail:  email,
              action:     AUDIT_ACTION.LOGIN_FAILED,
              entityType: AUDIT_ENTITY.AUTH,
              metadata:   { reason: 'invalid_password' },
            })
            return null
          }

          // Audit log — login réussi
          await logAction({
            userId:     user.id,
            userEmail:  user.email,
            action:     AUDIT_ACTION.LOGIN,
            entityType: AUDIT_ENTITY.AUTH,
          })

          // Retour des données utilisateur (sans le mot de passe)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error('Error in authorize:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Ajout des données utilisateur au token JWT
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      // Ajout des données du token à la session
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
})

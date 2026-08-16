import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { prisma } from '@/lib/db/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { logAction } from '@/lib/audit/logAction'
import { AUDIT_ACTION, AUDIT_ENTITY } from '@/lib/audit/constants'
import { createEmailTransport, emailConfig } from '@/lib/config/email'
import { pendingUserRequestEmailTemplate } from '@/lib/email/user-templates'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
})

/**
 * Recherche un User par email principal, avec fallback sur les emails
 * secondaires (UserIdentifier). Utilisée par authorize() (Credentials) et par
 * les callbacks signIn/jwt du provider Google — même logique de résolution
 * des deux côtés, un seul endroit à maintenir.
 */
async function findUserByEmail(email: string) {
  let user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    const identifier = await prisma.userIdentifier.findUnique({
      where: { email },
      include: { user: true },
    })
    if (identifier) {
      user = identifier.user
    }
  }

  return user
}

/** Notifie tous les ADMIN actifs qu'une nouvelle demande d'accès est en attente. */
async function notifyAdminsPendingRequest(email: string, name: string) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', accountStatus: 'ACTIVE' },
      select: { email: true },
    })
    if (admins.length === 0) return

    const transporter = createEmailTransport()
    await transporter.sendMail({
      from: emailConfig.from,
      to: admins.map((a) => a.email),
      subject: 'Nouvelle demande d\'accès — STAM',
      html: pendingUserRequestEmailTemplate({ email, name }),
    })
  } catch (error) {
    console.error('[notifyAdminsPendingRequest] Erreur envoi email:', error)
    // Ne jamais bloquer le flux de connexion si l'email échoue
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      // clientId/clientSecret résolus automatiquement depuis AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET,
      // mais on garde un profile() explicite pour satisfaire le typage User
      // (role/accountStatus) sans jamais faire confiance à ces valeurs placeholder —
      // le callback jwt ci-dessous les écrase systématiquement depuis la base.
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
          role: 'VISITEUR',
          accountStatus: 'PENDING',
        }
      },
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        try {
          const { email, password } = await loginSchema.parseAsync(credentials)

          const user = await findUserByEmail(email)

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

          if (!user.password) {
            // Compte créé via Google, pas de mot de passe — connexion Credentials impossible
            console.log('No password set for user:', email)
            await logAction({
              userEmail:  email,
              action:     AUDIT_ACTION.LOGIN_FAILED,
              entityType: AUDIT_ENTITY.AUTH,
              metadata:   { reason: 'no_password_set' },
            })
            return null
          }

          if (user.accountStatus !== 'ACTIVE') {
            console.log('Account not active:', email, user.accountStatus)
            await logAction({
              userEmail:  email,
              action:     AUDIT_ACTION.LOGIN_FAILED,
              entityType: AUDIT_ENTITY.AUTH,
              metadata:   { reason: 'account_not_active', accountStatus: user.accountStatus },
            })
            return null
          }

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

          await logAction({
            userId:     user.id,
            userEmail:  user.email,
            action:     AUDIT_ACTION.LOGIN,
            entityType: AUDIT_ENTITY.AUTH,
          })

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            accountStatus: user.accountStatus,
          }
        } catch (error) {
          console.error('Error in authorize:', error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      // Credentials : authorize() a déjà validé/rejeté. Rien à ajouter ici,
      // mais signIn() est appelé pour TOUS les providers — on laisse passer.
      if (account?.provider !== 'google') {
        return true
      }

      const email = profile?.email

      if (!email) {
        return false
      }

      if (profile?.email_verified === false) {
        console.log('Google email not verified, refusé:', email)
        return false
      }

      try {
        const dbUser = await findUserByEmail(email)

        if (dbUser) {
          if (dbUser.accountStatus === 'ACTIVE') {
            await logAction({
              userId:     dbUser.id,
              userEmail:  dbUser.email,
              action:     AUDIT_ACTION.LOGIN,
              entityType: AUDIT_ENTITY.AUTH,
              metadata:   { provider: 'google' },
            })
            return true
          }

          if (dbUser.accountStatus === 'PENDING') {
            return '/login?error=pending_approval'
          }

          if (dbUser.accountStatus === 'DEACTIVATED') {
            return '/login?error=account_deactivated'
          }

          // REJECTED
          return '/login?error=account_rejected'
        }

        // Aucun compte existant — création en attente de validation ADMIN
        const name = profile?.name ?? email
        const newUser = await prisma.user.create({
          data: {
            email,
            name,
            password: null,
            role: 'VISITEUR',
            accountStatus: 'PENDING',
          },
        })

        await logAction({
          userId:     newUser.id,
          userEmail:  newUser.email,
          action:     AUDIT_ACTION.CREATE,
          entityType: AUDIT_ENTITY.USER,
          metadata:   { source: 'google_signup' },
        })

        await notifyAdminsPendingRequest(email, name)

        return '/login?error=pending_approval'
      } catch (error) {
        console.error('Error in signIn (google):', error)
        return false
      }
    },

    async jwt({ token, user, account }) {
      // Login Credentials : user vient de authorize(), déjà fiable.
      if (user && account?.provider === 'credentials') {
        token.id = user.id
        token.role = user.role
        token.accountStatus = user.accountStatus
      }

      // Login Google : le profil OAuth n'a jamais de role/accountStatus fiables
      // (le profile() ci-dessus ne fournit que des placeholders). On sait,
      // via signIn ci-dessus, qu'un User ACTIVE existe pour cet email : on
      // relit sa ligne en base pour obtenir le rôle et le statut réels.
      if (user && account?.provider === 'google') {
        const email = user.email ?? (token.email as string | undefined)
        const dbUser = email ? await findUserByEmail(email) : null

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.accountStatus = dbUser.accountStatus
          token.name = dbUser.name // nom STAM en base, pas celui du profil Google
        }
      }

      return token
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.accountStatus = token.accountStatus as string
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
    // Erreurs Auth.js non prévues explicitement (Configuration, OAuthCallback
    // si Google Cloud Console est mal configuré, etc.) reviennent sur /login
    // au lieu de la page /api/auth/error générique.
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
})

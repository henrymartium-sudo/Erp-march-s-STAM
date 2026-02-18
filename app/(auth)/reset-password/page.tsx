import { Suspense } from 'react'
import { ResetPasswordContent } from './ResetPasswordContent'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(30,58,95,0.12)] border border-gray-100 p-8 text-center">
        <div className="h-8 w-8 border-2 border-[hsl(var(--stam-primary))] border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}

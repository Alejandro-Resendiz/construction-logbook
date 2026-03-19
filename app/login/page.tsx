import LoginForm from '@/app/components/LoginForm'
import { getDictionary } from '@/lib/i18n'

export default async function LoginPage() {
  const dict = getDictionary('es')

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            {dict.admin.login_title}
          </h1>
          <LoginForm dict={dict.admin} />
        </div>
      </div>
    </main>
  )
}

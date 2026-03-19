import { getDictionary } from '@/lib/i18n'
import UpdateLogForm from '@/app/components/UpdateLogForm'

export default async function UpdateLogPage() {
  const dict = getDictionary('es')

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {dict.update_log.title}
          </h1>
          <UpdateLogForm dict={dict.update_log} />
        </div>
      </div>
    </main>
  )
}

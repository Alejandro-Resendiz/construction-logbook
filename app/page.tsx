import { supabase } from '@/lib/supabase'
import { getDictionary } from '@/lib/i18n'
import MachineryLogForm from '@/app/components/MachineryLogForm'

export default async function NewLogPage() {
  const dict = getDictionary('es')

  const { data: machinery, error: machError } = await supabase
    .from('machinery')
    .select('machinery_id, machinery_name')

  const { data: projects, error: projError } = await supabase
    .from('projects')
    .select('project_id, project_name')

  if (machError || projError) {
    console.error('Error fetching data:', machError || projError)
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {dict.new_log.title}
          </h1>
          <MachineryLogForm 
            machinery={machinery || []} 
            projects={projects || []} 
            dict={dict.new_log}
          />
        </div>
      </div>
    </main>
  )
}

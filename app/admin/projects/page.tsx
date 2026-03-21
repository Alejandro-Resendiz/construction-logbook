'use client'

import { useState, useEffect } from 'react'
import { getDictionary } from '@/lib/i18n'
import { Plus, X, List } from 'lucide-react'
import { createProject } from './actions'
import ProjectRowActions from '@/app/components/ProjectRowActions'
import { useProjectsStore } from '@/lib/store/projectsStore'
import { toast } from 'sonner'

export default function ProjectsPage() {
  const [dict, setDict] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  
  // Use Zustand store
  const { projects, loading, fetchProjects, addProject } = useProjectsStore()

  useEffect(() => {
    setDict(getDictionary('es'))
    fetchProjects()
  }, [fetchProjects])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const projectName = formData.get('project_name')

    if (!projectName) {
      setErrors(['project_name'])
      toast.error(dict.common.notifications?.missing_fields || 'Por favor ingrese el nombre del proyecto.')
      return
    }

    setErrors([])
    const res = await createProject(formData)
    if (res.success && res.project) {
      addProject(res.project) // Update local store
      toast.success(dict.common.notifications?.success_update || 'Proyecto creado')
      setShowForm(false)
    } else {
      const errorMsg = dict.common.notifications?.[res.error as string] || dict.common.notifications?.generic_error || 'Error al crear'
      toast.error(errorMsg)
    }
  }

  if (!dict) return <div className="p-8 text-center text-gray-500 italic">Cargando...</div>

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <List className="text-blue-600" />
            {dict.admin.projects.title}
          </h1>
          <button 
            onClick={() => {
              setShowForm(!showForm)
              setErrors([])
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-all ${
              showForm 
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' 
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md'
            }`}
          >
            {showForm ? <X size={20} /> : <Plus size={20} />}
            {showForm ? dict.common.cancel : dict.admin.projects.new_project}
          </button>
        </header>

        {/* Collapsible Creation Form */}
        {showForm && (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              {dict.admin.projects.new_project}
            </h2>
            <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  {dict.admin.projects.project_name}
                  <span className="text-red-500">*</span>
                </label>
                <input 
                  type="text" 
                  name="project_name" 
                  className={`w-full p-2 border rounded-lg text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                    errors.includes('project_name') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                  autoFocus
                />
              </div>
              <button 
                type="submit"
                className="w-full md:w-auto px-8 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors shadow-sm"
              >
                {dict.admin.projects.create}
              </button>
            </form>
          </div>
        )}

        {/* Projects List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="p-4 font-semibold text-gray-600">{dict.admin.projects.project_name}</th>
                <th className="p-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="text-gray-900">
              {loading ? (
                <tr><td colSpan={2} className="p-8 text-center text-gray-400 italic">Cargando proyectos...</td></tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-gray-400">
                    {dict.admin.projects.no_projects}
                  </td>
                </tr>
              ) : (
                projects.map((project) => (
                  <ProjectRowActions 
                    key={project.project_id} 
                    project={project} 
                    dict={dict}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}

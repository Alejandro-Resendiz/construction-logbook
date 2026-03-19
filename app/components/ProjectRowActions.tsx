'use client'

import { useState } from 'react'
import { Edit2, Trash2, Check, X } from 'lucide-react'
import { updateProject, deleteProject } from '@/app/admin/projects/actions'
import { useProjectsStore } from '@/lib/store/projectsStore'

interface ProjectRowActionsProps {
  project: any
  dict: any
}

export default function ProjectRowActions({ project, dict }: ProjectRowActionsProps) {
  const [isEditing, setIsOpen] = useState(false)
  const [name, setName] = useState(project.project_name)
  const [loading, setLoading] = useState(false)

  // Use Zustand store actions
  const { removeProject, updateProject: updateLocalProject } = useProjectsStore()

  const handleUpdate = async () => {
    setLoading(true)
    const formData = new FormData()
    formData.append('project_name', name)
    const res = await updateProject(project.project_id, formData)
    if (res.success && res.project) {
      updateLocalProject(project.project_id, res.project)
      setIsOpen(false)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (confirm('¿Estás seguro de eliminar este proyecto?')) {
      setLoading(true)
      const res = await deleteProject(project.project_id)
      if (res.success) {
        removeProject(project.project_id)
      }
      setLoading(false)
    }
  }

  if (isEditing) {
    return (
      <tr className="border-b border-blue-50 bg-blue-50/30">
        <td className="p-4">
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full p-1 border rounded bg-white text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        </td>
        <td className="p-4 text-right">
          <div className="flex justify-end gap-2">
            <button 
              onClick={handleUpdate} 
              disabled={loading}
              className="p-1 text-green-600 hover:bg-green-50 rounded"
            >
              <Check size={18} />
            </button>
            <button 
              onClick={() => setIsOpen(false)} 
              disabled={loading}
              className="p-1 text-gray-400 hover:bg-gray-100 rounded"
            >
              <X size={18} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50">
      <td className="p-4">{project.project_name}</td>
      <td className="p-4 text-right">
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => setIsOpen(true)}
            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <Edit2 size={18} />
          </button>
          <button 
            onClick={handleDelete}
            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </td>
    </tr>
  )
}

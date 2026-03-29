import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface DepreciationInfo {
  machinery_id: number
  optimal_fuel_consumption?: number
  service_life?: number
  purchase_value?: number
  rescue_value?: number
  estimated_depreciation_rate?: number
  machinery?: any
}

interface MachineryDepreciationState {
  depreciations: DepreciationInfo[]
  loading: boolean
  fetchDepreciations: () => Promise<void>
  upsertDepreciation: (depr: DepreciationInfo) => Promise<{ success: boolean; error?: any }>
}

export const useMachineryDepreciationStore = create<MachineryDepreciationState>((set, get) => ({
  depreciations: [],
  loading: false,
  fetchDepreciations: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('machinery_depreciation')
      .select(`
        *,
        machinery:machinery_id (
          machinery_full_name,
          external_code,
          is_rented
        )
      `)
    
    if (error) {
      console.error('Error fetching depreciations:', error)
      set({ loading: false })
      return
    }

    set({ depreciations: data || [], loading: false })
  },
  upsertDepreciation: async (depr) => {
    const { data, error } = await supabase
      .from('machinery_depreciation')
      .upsert(depr)
      .select(`
        *,
        machinery:machinery_id (
          machinery_full_name,
          external_code,
          is_rented
        )
      `)
      .single()

    if (error) {
      return { success: false, error }
    }

    set((state) => {
      const exists = state.depreciations.some(d => d.machinery_id === depr.machinery_id)
      if (exists) {
        return {
          depreciations: state.depreciations.map(d => d.machinery_id === depr.machinery_id ? data : d)
        }
      }
      return {
        depreciations: [...state.depreciations, data]
      }
    })

    return { success: true }
  }
}))

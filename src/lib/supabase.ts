import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Profile = {
  id: string
  full_name: string
  email: string
  role: 'agency' | 'brand' | 'director'
  created_at: string
}

export type Project = {
  id: string
  name: string
  brand: string
  status: string
  created_by: string
  created_at: string
}

export type Reference = {
  id: string
  project_id: string
  sno: number
  reference_link: string | null
  category: string | null
  script_notes: string | null
  edit_notes: string | null
  brand_callouts: string | null
  shot_on_day: string | null
  location: string | null
  camera: string | null
  file_number: string | null
  approval_status: 'pending' | 'approved' | 'rejected'
  is_locked: boolean
  assigned_director: string | null
  director_notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type ReferenceLog = {
  id: string
  reference_id: string
  user_name: string
  user_role: string
  action: string
  field_changed: string | null
  old_value: string | null
  new_value: string | null
  created_at: string
}

export type VideoReview = {
  id: string
  project_id: string
  file_name: string
  drive_folder_link: string | null
  brand_feedback: string | null
  status: 'pending' | 'addressing' | 'resolved'
  created_by: string | null
  created_at: string
  updated_at: string
}

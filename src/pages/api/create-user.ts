import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, password, full_name, role } = req.body
  if (!email || !password || !full_name || !role) return res.status(400).json({ error: 'Missing fields' })

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { full_name, role }
  })
  if (error) return res.status(400).json({ error: error.message })

  const { error: profileError } = await supabaseAdmin.from('profiles').insert({
    id: data.user.id, full_name, email, role
  })
  if (profileError) return res.status(400).json({ error: profileError.message })

  return res.status(200).json({ success: true })
}

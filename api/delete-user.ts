import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  console.log('[API] delete user route called', { method: req.method, query: req.query });

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth_id = req.query.auth_id;
  if (!auth_id) {
    return res.status(400).json({ error: 'Missing auth_id query parameter' });
  }

  if (!serviceRoleKey || !supabaseUrl) {
    return res.status(500).json({ error: 'Supabase service role key or URL missing from server environment.' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { error: p1Error } = await supabaseAdmin.from('profiles').delete().eq('auth_id', auth_id);
    if (p1Error) console.warn('[API] Profile(auth_id) delete note:', p1Error.message);

    const { error: p2Error } = await supabaseAdmin.from('profiles').delete().eq('id', auth_id);
    if (p2Error) console.warn('[API] Profile(id) delete note:', p2Error.message);

    const { error: a1Error } = await supabaseAdmin.from('applications').delete().eq('auth_id', auth_id);
    if (a1Error) console.warn('[API] Application(auth_id) delete note:', a1Error.message);

    const { error: a2Error } = await supabaseAdmin.from('applications').delete().eq('id', auth_id);
    if (a2Error) console.warn('[API] Application(id) delete note:', a2Error.message);

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(auth_id);
    if (isUUID) {
      const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(auth_id);
      if (authError) {
        console.error('[API] Supabase Auth admin delete failed:', authError.message);
        if (authError.message.includes('User not found') || authError.status === 404) {
          return res.status(200).json({ success: true, message: 'Records cleaned up, auth user was not found.' });
        }
        return res.status(500).json({ error: `Auth Error: ${authError.message}` });
      }
    }

    return res.status(200).json({ success: true, message: 'Deletion cleanup completed.' });
  } catch (err: any) {
    console.error('[API] Fatal error in delete user handler:', err);
    return res.status(500).json({ error: err?.message || 'Internal server error' });
  }
}

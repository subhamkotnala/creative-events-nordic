import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  if (!serviceRoleKey || !supabaseUrl) {
    return res.status(500).json({ error: 'Supabase configuration missing in server.' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized token' });
  }

  const { adId, content, senderId, senderRole } = req.body;

  if (!adId || !content || !senderId || !senderRole) {
    return res.status(400).json({ error: 'Missing required fields: adId, content, senderId, senderRole' });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('ad_replies')
      .insert({
        ad_id: adId,
        sender_id: senderId,
        sender_role: senderRole,
        content,
        is_read: false,
      })
      .select()
      .single();

    if (error) throw error;
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('[API] Failed to send ad reply:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

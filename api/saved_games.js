const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { visitorId } = req.query;
  if (!visitorId) {
    return res.status(400).json({ error: 'Missing visitorId' });
  }

  const { data, error } = await supabase
    .from('saved_games')
    .select('title,store,price')
    .eq('visitor_id', visitorId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data);
};

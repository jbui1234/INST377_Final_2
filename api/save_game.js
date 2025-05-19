const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { visitorId, title } = req.body;
  if (!visitorId || !title) {
    return res.status(400).json({ error: 'Missing visitorId or title' });
  }

  const searchRes = await fetch(
    `https://www.cheapshark.com/api/1.0/games?title=${encodeURIComponent(title)}`
  );
  const searchData = await searchRes.json();
  if (!searchData.length) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const gameID = searchData[0].gameID;
  const gameRes = await fetch(
    `https://www.cheapshark.com/api/1.0/games?id=${gameID}`
  );
  const { deals } = await gameRes.json();
  const deal = Array.isArray(deals) && deals[0];
  if (!deal) {
    return res.status(404).json({ error: 'No deals found' });
  }

  const storeRes = await fetch('https://www.cheapshark.com/api/1.0/stores');
  const storeList = await storeRes.json();
  const storeName =
    storeList.find(s => s.storeID === deal.storeID)?.storeName ||
    `Store ${deal.storeID}`;

  const { data, error } = await supabase
    .from('saved_games')
    .insert([
      {
        visitor_id: visitorId,
        title: searchData[0].external,
        store: storeName,
        price: parseFloat(deal.price)
      }
    ]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json(data[0]);
};

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  console.log('[API] test endpoint called', { method: req.method, params: req.query, url: req.url });
  res.status(200).json({ 
    test: 'ok',
    method: req.method,
    query: req.query,
    params: req.query
  });
}

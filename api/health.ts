export default function handler(req: any, res: any) {
  console.log('[API] health route called', { method: req.method, url: req.url });
  res.status(200).json({ status: 'ok' });
}

import express from 'express';
import { createLogger } from '@ideia/logger';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  logger.info('Server running on port ${port}');
});

export default app;

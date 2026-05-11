import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import patientRoutes from './routes/patients';
import { extractOpenAiKey } from './middleware/openaiKey';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    allowedHeaders: ['Content-Type', 'X-OpenAI-Key'],
  })
);
app.use(express.json());

// Strip X-OpenAI-Key off req.headers before any logger sees it. Must run before
// morgan and before any future request-logging middleware.
app.use(extractOpenAiKey);

// 'dev' format does not log request headers. If you ever swap this for a custom
// format, do NOT include `:req[header]` tokens — req.headers no longer carries
// x-openai-key after extractOpenAiKey, but other secrets may leak the same way.
app.use(morgan('dev'));

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/patients', patientRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Clinical Decision Support API running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;

import express, { Request, Response, NextFunction } from 'express';
import lockerRoutes from './routes/lockerRoutes';
import rentalRoutes from './routes/rentalRoutes';
import memberRoutes from './routes/memberRoutes';
import auditRoutes from './routes/auditRoutes';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: '体育馆更衣柜租用系统运行正常',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/lockers', lockerRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/audit', auditRoutes);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    success: false,
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
    path: req.path,
  });
});

export default app;

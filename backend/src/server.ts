import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import adminRoutes from './routes/admin';
import eventsRoutes from './routes/events';
import ticketsRoutes from './routes/tickets';
import scannerRoutes from './routes/scanner';

const app = express();
const PORT: number = Number(process.env.PORT) || 3000;

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());

// Rate limiting для auth
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Слишком много попыток. Попробуйте позже.'
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/scanner', scannerRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'OK',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
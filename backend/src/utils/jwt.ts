import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_change_this_in_production_2026';
const JWT_EXPIRES_IN = '30d'; // Токен действителен 30 дней

// Интерфейс для данных, которые будут зашиты внутри токена
export interface TokenPayload {
  userId: number;
  phone: string;
  role: string;
}

/**
 * Генерирует JWT токен
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Проверяет и декодирует JWT токен
 * Возвращает данные пользователя, если токен валиден, или null, если нет
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { findUserByEmail, findUserById, createUser } from './db.js';
import { authenticateJwt, JWT_SECRET, type AuthenticatedRequest } from './middleware.js';

const router = Router();

// Rate limiter for auth endpoints: 25 attempts per 15 minutes per IP
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Terlalu banyak permintaan dari alamat IP ini. Silakan coba lagi setelah 15 menit.',
  },
});

const BCRYPT_SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = '7d';

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// POST /register
router.post('/register', authRateLimiter, async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string' || !isValidEmail(email)) {
      res.status(400).json({ error: 'Format alamat email tidak valid.' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      res.status(400).json({ error: 'Kata sandi minimal harus 6 karakter.' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = findUserByEmail(normalizedEmail);
    if (existingUser) {
      res.status(409).json({ error: 'Alamat email sudah terdaftar. Silakan gunakan email lain atau masuk.' });
      return;
    }

    // Hash password with bcrypt 12 rounds
    const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const userId = crypto.randomUUID();

    const newUser = createUser(userId, normalizedEmail, passwordHash);

    // Sign JWT token valid for 7 days
    const token = jwt.sign(
      { id: newUser.id, email: newUser.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(201).json({
      message: 'Registrasi berhasil.',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        created_at: newUser.created_at,
      },
    });
  } catch (error) {
    console.error('Error in /register:', error);
    res.status(500).json({ error: 'Terjadi kesalahan internal server saat registrasi.' });
  }
});

// POST /login
router.post('/login', authRateLimiter, async (req, res): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Harap isi alamat email dan kata sandi.' });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = findUserByEmail(normalizedEmail);

    if (!user) {
      res.status(401).json({ error: 'Email atau kata sandi tidak valid.' });
      return;
    }

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) {
      res.status(401).json({ error: 'Email atau kata sandi tidak valid.' });
      return;
    }

    // Sign JWT token valid for 7 days
    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({
      message: 'Login berhasil.',
      token,
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error in /login:', error);
    res.status(500).json({ error: 'Terjadi kesalahan internal server saat login.' });
  }
});

// GET /me (Protected)
router.get('/me', authenticateJwt, (req: AuthenticatedRequest, res): void => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Sesi tidak sah.' });
      return;
    }

    const user = findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ error: 'Pengguna tidak ditemukan di database.' });
      return;
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
    });
  } catch (error) {
    console.error('Error in /me:', error);
    res.status(500).json({ error: 'Gagal mengambil data profil pengguna.' });
  }
});

export default router;

import express, { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { LoginRequest, AuthResponse, UserProfile, User } from '../types';
import { getUserByUsername, addUser, userExists, getAllUsers, updateUser } from '../services/database';
import { generateToken, authenticateToken } from '../middleware/auth';
import { logAudit } from '../services/audit';

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

// Register new user (first user becomes admin)
router.post('/register', registerLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password, name } = req.body;

    if (!username || !password || !name) {
      res.status(400).json({ error: 'Username, password, and name are required' });
      return;
    }

    if (userExists(username)) {
      res.status(409).json({ error: 'Username already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const allUsers = getAllUsers();
    const isFirstUser = allUsers.length === 0;

    const user: User = {
      userId: uuidv4(),
      username,
      passwordHash,
      role: isFirstUser ? 'admin' : 'user',
      profile: { name }
    };

    addUser(user);

    const token = generateToken({
      userId: user.userId,
      username: user.username,
      role: user.role
    });

    logAudit({
      userId: user.userId,
      action: 'user.register',
      details: `username=${username}; role=${user.role}`,
    });

    const response: AuthResponse = {
      token,
      userId: user.userId,
      role: user.role,
      profile: user.profile
    };

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', loginLimiter, async (req: Request, res: Response) => {
  try {
    const { username, password }: LoginRequest = req.body;

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password are required' });
      return;
    }

    const user = getUserByUsername(username);
    if (!user) {
      logAudit({
        userId: 'anonymous',
        action: 'user.login.failed',
        details: `username=${username}; reason=user_not_found`,
      });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      logAudit({
        userId: user.userId,
        action: 'user.login.failed',
        details: `username=${username}; reason=bad_password`,
      });
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken({
      userId: user.userId,
      username: user.username,
      role: user.role
    });

    logAudit({
      userId: user.userId,
      action: 'user.login',
      details: `username=${username}`,
    });

    const response: AuthResponse = {
      token,
      userId: user.userId,
      role: user.role,
      profile: user.profile
    };

    res.json(response);
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, (req: Request, res: Response) => {
  try {
    const user = getUserByUsername(req.user!.username);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user.profile);
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, (req: Request, res: Response) => {
  try {
    const profile: UserProfile = req.body;

    if (!profile.name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const user = getUserByUsername(req.user!.username);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    user.profile = profile;
    updateUser(user.userId, user);

    res.json({ message: 'Profile updated successfully' });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Check if user is admin
router.get('/is-admin', authenticateToken, (req: Request, res: Response) => {
  res.json(req.user!.role === 'admin');
});

export default router;

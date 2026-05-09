import { describe, it, expect } from 'vitest';
import jwt from 'jsonwebtoken';
import { generateToken } from './auth';
import { JwtPayload } from '../types';

describe('generateToken', () => {
  const payload: JwtPayload = {
    userId: 'test-user-id',
    username: 'tester',
    role: 'user',
  };

  it('produces a token that decodes back to the original payload', () => {
    const token = generateToken(payload);
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;

    expect(decoded.userId).toBe(payload.userId);
    expect(decoded.username).toBe(payload.username);
    expect(decoded.role).toBe(payload.role);
  });

  it('sets a 24h expiry', () => {
    const token = generateToken(payload);
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as jwt.JwtPayload;

    expect(decoded.exp).toBeDefined();
    expect(decoded.iat).toBeDefined();
    const ttlSeconds = (decoded.exp as number) - (decoded.iat as number);
    expect(ttlSeconds).toBe(24 * 60 * 60);
  });

  it('rejects tokens signed with a different secret', () => {
    const token = jwt.sign(payload, 'wrong-secret');
    expect(() => jwt.verify(token, process.env.JWT_SECRET as string)).toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import {
  parseBloodPressure,
  formatBloodPressure,
  senderToRole,
  roleToSender,
} from './database';

describe('blood pressure mapping', () => {
  it('parses "120/80"', () => {
    expect(parseBloodPressure('120/80')).toEqual({ systolic: 120, diastolic: 80 });
  });
  it('returns nulls for malformed input', () => {
    expect(parseBloodPressure('')).toEqual({ systolic: null, diastolic: null });
    expect(parseBloodPressure('high')).toEqual({ systolic: null, diastolic: null });
  });
  it('round-trips through formatBloodPressure', () => {
    const { systolic, diastolic } = parseBloodPressure('118/76');
    expect(formatBloodPressure(systolic, diastolic)).toBe('118/76');
  });
});

describe('chat role mapping', () => {
  it('maps sender labels to roles and back', () => {
    expect(senderToRole('Doctor')).toBe('doctor');
    expect(senderToRole('AI Assistant')).toBe('ai');
    expect(roleToSender('doctor')).toBe('Doctor');
    expect(roleToSender('ai')).toBe('AI Assistant');
  });
});

import express, { Request, Response } from 'express';
import { AdminSettings } from '../types';
import { getSettings, updateSettings, getAllAuditLogs } from '../services/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { logAudit } from '../services/audit';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 4) return '****';
  return `${key.slice(0, 3)}...${key.slice(-4)}`;
}

// Get OpenAI API key (masked)
router.get('/openai-key', (req: Request, res: Response) => {
  try {
    const settings = getSettings();
    logAudit({
      userId: req.user!.userId,
      action: 'admin.openai_key.read',
    });
    res.json({
      openAiApiKey: maskKey(settings.openAiApiKey),
      hasKey: !!settings.openAiApiKey,
    });
  } catch (error: any) {
    console.error('Get OpenAI key error:', error);
    res.status(500).json({ error: 'Failed to get OpenAI API key' });
  }
});

// Update OpenAI API key
router.put('/openai-key', (req: Request, res: Response) => {
  try {
    const { openAiApiKey } = req.body;

    if (openAiApiKey === undefined) {
      res.status(400).json({ error: 'OpenAI API key is required' });
      return;
    }

    const settings: AdminSettings = { openAiApiKey };
    updateSettings(settings);

    logAudit({
      userId: req.user!.userId,
      action: 'admin.openai_key.update',
      details: openAiApiKey ? 'set' : 'cleared',
    });

    res.json({ message: 'OpenAI API key updated successfully' });
  } catch (error: any) {
    console.error('Update OpenAI key error:', error);
    res.status(500).json({ error: 'Failed to update OpenAI API key' });
  }
});

// Get all settings (with the OpenAI key masked)
router.get('/settings', (req: Request, res: Response) => {
  try {
    const settings = getSettings();
    logAudit({
      userId: req.user!.userId,
      action: 'admin.settings.read',
    });
    res.json({
      ...settings,
      openAiApiKey: maskKey(settings.openAiApiKey),
      hasOpenAiKey: !!settings.openAiApiKey,
    });
  } catch (error: any) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Get audit logs
router.get('/audit-logs', (req: Request, res: Response) => {
  try {
    const logs = getAllAuditLogs();
    logAudit({
      userId: req.user!.userId,
      action: 'admin.audit_logs.read',
    });
    res.json(logs);
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

export default router;

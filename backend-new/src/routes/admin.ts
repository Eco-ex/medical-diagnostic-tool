import express, { Request, Response } from 'express';
import { AdminSettings } from '../types';
import { getSettings, updateSettings, getAllAuditLogs } from '../services/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// All routes require admin authentication
router.use(authenticateToken);
router.use(requireAdmin);

// Get OpenAI API key
router.get('/openai-key', (req: Request, res: Response) => {
  try {
    const settings = getSettings();
    res.json({ openAiApiKey: settings.openAiApiKey });
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
    
    res.json({ message: 'OpenAI API key updated successfully' });
  } catch (error: any) {
    console.error('Update OpenAI key error:', error);
    res.status(500).json({ error: 'Failed to update OpenAI API key' });
  }
});

// Get all settings
router.get('/settings', (req: Request, res: Response) => {
  try {
    const settings = getSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Get audit logs
router.get('/audit-logs', (req: Request, res: Response) => {
  try {
    const logs = getAllAuditLogs();
    res.json(logs);
  } catch (error: any) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Failed to get audit logs' });
  }
});

export default router;



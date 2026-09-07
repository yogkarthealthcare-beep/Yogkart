const express = require('express');
const { exec } = require('child_process');
const router = express.Router();

const DEPLOY_SECRET = process.env.DEPLOY_SECRET || 'yogkart_deploy_2026';

/**
 * GET /api/deploy-migrate?secret=yogkart_deploy_2026
 * Executes schema verification and migrations directly
 */
router.all('/deploy-migrate', async (req, res) => {
  const providedSecret = req.query.secret || req.body.secret || req.headers['x-deploy-secret'];

  if (providedSecret !== DEPLOY_SECRET) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized deploy request. Secret key is missing or invalid.'
    });
  }

  try {
    const { ensureDatabaseSchema } = require('../services/schema.service');
    await ensureDatabaseSchema();
    return res.json({
      success: true,
      message: '✅ Core database schema & product columns verified/created successfully!'
    });
  } catch (err) {
    console.error('❌ [Auto-Migrate] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * GET /api/deploy-pull?secret=yogkart_deploy_2026
 * Automatically executes 'git pull origin main' and 'pm2 restart all' on the VPS.
 */
router.all('/deploy-pull', (req, res) => {
  const providedSecret = req.query.secret || req.body.secret || req.headers['x-deploy-secret'];

  if (providedSecret !== DEPLOY_SECRET) {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized deploy request. Secret key is missing or invalid.'
    });
  }

  console.log('🚀 [Auto-Deploy] Triggering VPS git pull & pm2 restart...');

  const isWin = process.platform === 'win32';
  const workDir = isWin ? process.cwd() : '/var/www/yogkart_backend';
  const shell = isWin ? 'cmd.exe' : '/bin/bash';
  const pullCmd = 'git pull origin main';
  const restartCmd = isWin ? 'echo Dev environment restart skipped' : 'pm2 restart all';

  exec(pullCmd, { cwd: workDir, shell }, (pullErr, pullStdout, pullStderr) => {
    if (pullErr) {
      console.error('❌ [Auto-Deploy] Git pull failed:', pullErr.message);
      return res.status(500).json({
        success: false,
        step: 'git pull',
        error: pullErr.message,
        stderr: pullStderr
      });
    }

    exec(restartCmd, { cwd: workDir, shell }, (restartErr, restartStdout, restartStderr) => {
      if (restartErr) {
        console.error('❌ [Auto-Deploy] PM2 restart failed:', restartErr.message);
        return res.status(500).json({
          success: false,
          step: 'pm2 restart',
          error: restartErr.message,
          pullOutput: pullStdout
        });
      }

      console.log('✅ [Auto-Deploy] VPS update and restart completed successfully!');
      return res.json({
        success: true,
        message: '🚀 VPS updated & restarted successfully!',
        pullOutput: pullStdout,
        restartOutput: restartStdout
      });
    });
  });
});

module.exports = router;

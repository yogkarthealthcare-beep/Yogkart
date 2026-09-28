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
    const { ensureSellerCenterSchema } = require('../services/seller-center/schema');
    await ensureDatabaseSchema();
    await ensureSellerCenterSchema();
    return res.json({
      success: true,
      message: '✅ Core database schema & Seller Center tables verified/created successfully!'
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
  const fs = require('fs');
  const defaultDir = fs.existsSync('/var/www/yogkart') ? '/var/www/yogkart' : '/var/www/yogkart_backend';
  const workDir = isWin ? process.cwd() : defaultDir;
  const shell = isWin ? 'cmd.exe' : '/bin/bash';
  const restartCmd = isWin
    ? 'echo Dev environment restart skipped'
    : 'export PATH=/root/.nvm/versions/node/v22.16.0/bin:$PATH; (sleep 1 && pm2 restart yogkart || pm2 restart all) > /dev/null 2>&1 &';

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

    exec(restartCmd, { cwd: workDir, shell });

    console.log('✅ [Auto-Deploy] Git pull complete. PM2 restart triggered in background.');
    return res.json({
      success: true,
      message: '🚀 VPS git pull completed & PM2 restart scheduled!',
      pullOutput: pullStdout,
    });
  });
});

/**
 * GET /api/deploy-status
 */
router.all('/deploy-status', (req, res) => {
  const isWin = process.platform === 'win32';
  const fs = require('fs');
  const defaultDir = fs.existsSync('/var/www/yogkart') ? '/var/www/yogkart' : '/var/www/yogkart_backend';
  const workDir = isWin ? process.cwd() : defaultDir;
  const shell = isWin ? 'cmd.exe' : '/bin/bash';

  exec('git log -n 1 --oneline', { cwd: workDir, shell }, (err, stdout) => {
    return res.json({
      success: true,
      lastCommit: stdout ? stdout.trim() : (err ? err.message : 'unknown'),
    });
  });
});

module.exports = router;

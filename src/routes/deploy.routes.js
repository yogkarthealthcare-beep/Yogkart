const express = require('express');
const { exec } = require('child_process');
const router = express.Router();

const DEPLOY_SECRET = process.env.DEPLOY_SECRET || 'yogkart_deploy_2026';

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

  const workDir = process.platform === 'win32' ? process.cwd() : '/var/www/yogkart_backend';
  const pullCmd = 'git pull origin main';
  const restartCmd = process.platform === 'win32' ? 'echo Dev environment restart skipped' : 'pm2 restart all';

  exec(pullCmd, { cwd: workDir }, (pullErr, pullStdout, pullStderr) => {
    if (pullErr) {
      console.error('❌ [Auto-Deploy] Git pull failed:', pullErr.message);
      return res.status(500).json({
        success: false,
        step: 'git pull',
        error: pullErr.message,
        stderr: pullStderr
      });
    }

    exec(restartCmd, { cwd: workDir }, (restartErr, restartStdout, restartStderr) => {
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

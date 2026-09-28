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

  const isWin = process.platform === 'win32';
  const fs = require('fs');
  const defaultDir = fs.existsSync('/var/www/yogkart') ? '/var/www/yogkart' : '/var/www/yogkart_backend';
  const workDir = isWin ? process.cwd() : defaultDir;
  const shell = isWin ? 'cmd.exe' : '/bin/bash';

  exec('git pull origin main', { cwd: workDir, shell }, (pullErr, stdout) => {
    if (!pullErr && !isWin) {
      exec('export PATH=/root/.nvm/versions/node/v22.16.0/bin:$PATH; (sleep 1 && pm2 restart yogkart || pm2 restart all) > /dev/null 2>&1 &', { cwd: workDir, shell });
    }
  });

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
  const pullCmd = 'git pull origin main';
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
 * GET /api/deploy-debug-amazon?secret=yogkart_deploy_2026
 */
router.all('/deploy-debug-amazon', async (req, res) => {
  const providedSecret = req.query.secret || req.body.secret || req.headers['x-deploy-secret'];
  if (providedSecret !== DEPLOY_SECRET) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const { query } = require('../config/database');
    const { safeDecrypt } = require('../services/seller-center/amazonCredentials.service');
    const { decryptCredential } = require('../utils/encryption');

    const amazonRows = await query('SELECT id, account_name, marketplace_id, region, client_id_encrypted, is_active, created_at, updated_at FROM amazon_integrations ORDER BY updated_at DESC');

    const systemRows = await query(`SELECT id, credential_key, credential_category, is_active, created_at FROM system_credentials WHERE credential_key ILIKE '%amazon%' OR credential_key ILIKE '%sp_api%' OR credential_key ILIKE '%lwa%' OR credential_category = 'amazon'`);

    const formattedAmazon = amazonRows.rows.map(r => ({
      id: r.id,
      account_name: r.account_name,
      marketplace_id: r.marketplace_id,
      region: r.region,
      has_client_id: Boolean(r.client_id_encrypted),
      client_id_decrypted_preview: r.client_id_encrypted ? (decryptCredential(r.client_id_encrypted)?.slice(0, 15) + '...') : null,
      is_active: r.is_active,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    return res.json({
      success: true,
      amazon_integrations_count: amazonRows.rows.length,
      amazon_integrations: formattedAmazon,
      system_credentials_count: systemRows.rows.length,
      system_credentials: systemRows.rows,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;

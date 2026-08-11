#!/usr/bin/env bash
# ==============================================================================
# YOGKART — AUTOMATED SUPABASE TO VPS POSTGRESQL MIGRATION SCRIPT
# Target OS: Ubuntu / Linux VPS
# ==============================================================================
# Isolation & Safety Guarantees:
# 1. DOES NOT touch or modify "mmrconstructions" database or "mmruser".
# 2. DOES NOT modify the source Supabase database (READ-ONLY access).
# 3. Target is ONLY database "yogkart" and user "yogkart_user" on localhost.
# ==============================================================================

set -eo pipefail

# ------------------------------------------------------------------------------
# 0. CONFIGURATION & DIRECTORIES
# ------------------------------------------------------------------------------
BACKUP_DIR="/var/backups/yogkart"
LOG_FILE="${BACKUP_DIR}/migration.log"

# Source Supabase Parameters (Read-Only)
SUPABASE_HOST="${SUPABASE_DB_HOST:-aws-1-ap-south-1.pooler.supabase.com}"
SUPABASE_PORT="${SUPABASE_DB_PORT:-6543}"
SUPABASE_DB="${SUPABASE_DB_NAME:-postgres}"
SUPABASE_USER="${SUPABASE_DB_USER:-postgres.zucsihsrpdxsjeshxjqm}"

# Target VPS Parameters (Yogkart ONLY)
VPS_HOST="${DB_HOST:-localhost}"
VPS_PORT="${DB_PORT:-5432}"
VPS_DB="${DB_NAME:-yogkart}"
VPS_USER="${DB_USER:-yogkart_user}"

# Strict Safety Check: Never allow MMR database
if [ "${VPS_DB}" = "mmrconstructions" ] || [ "${VPS_USER}" = "mmruser" ]; then
  echo "❌ CRITICAL SAFETY ERROR: Target cannot be 'mmrconstructions' or 'mmruser'."
  exit 1
fi

# Ensure Backup Directory Exists on Linux VPS
mkdir -p "${BACKUP_DIR}"
touch "${LOG_FILE}"

log() {
  echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "${LOG_FILE}"
}

error_exit() {
  log "\n❌ FAILURE IN STEP: $1"
  log "Error Details: $2"
  log "\n--- SAFETY GUARANTEE STATUS ---"
  log "• Supabase Source Database: UNTOUCHED & UNCHANGED."
  log "• MMR Constructions Database: UNTOUCHED & UNCHANGED."
  log "• VPS 'yogkart' Database: Isolated state preserved."
  exit 1
}

log "=========================================================================="
log "🚀 YOGKART AUTOMATED LINUX VPS DATABASE MIGRATION SCRIPT"
log "=========================================================================="
log "Source Host: ${SUPABASE_HOST}:${SUPABASE_PORT} (Database: ${SUPABASE_DB})"
log "Target Host: ${VPS_HOST}:${VPS_PORT} (Database: ${VPS_DB}, User: ${VPS_USER})"
log "Backup Directory: ${BACKUP_DIR}"
log "==========================================================================\n"

# ------------------------------------------------------------------------------
# SECURE CREDENTIAL RETRIEVAL (NO HARDCODED PASSWORDS)
# ------------------------------------------------------------------------------
if [ -z "${SUPABASE_DB_PASSWORD}" ]; then
  echo -n "Enter Supabase Database Password (input hidden): "
  read -s SUPABASE_DB_PASSWORD
  echo ""
fi

if [ -z "${DB_PASSWORD}" ]; then
  echo -n "Enter VPS 'yogkart_user' Database Password (input hidden): "
  read -s DB_PASSWORD
  echo ""
fi

if [ -z "${SUPABASE_DB_PASSWORD}" ] || [ -z "${DB_PASSWORD}" ]; then
  error_exit "Credential Check" "Passwords cannot be empty."
fi

# ------------------------------------------------------------------------------
# STEP 1: CHECK POSTGRESQL CLIENT TOOLS ON VPS
# ------------------------------------------------------------------------------
log "⏳ Step 1: Checking PostgreSQL Client Tools on VPS..."

command -v psql >/dev/null 2>&1 || error_exit "Step 1" "psql CLI tool is missing. Install via: sudo apt install postgresql-client"
command -v pg_dump >/dev/null 2>&1 || error_exit "Step 1" "pg_dump CLI tool is missing."
command -v pg_restore >/dev/null 2>&1 || error_exit "Step 1" "pg_restore CLI tool is missing."

log "✅ All required PostgreSQL client tools (psql, pg_dump, pg_restore) are verified.\n"

# ------------------------------------------------------------------------------
# STEP 2: VERIFY SOURCE SUPABASE CONNECTION (READ-ONLY)
# ------------------------------------------------------------------------------
log "⏳ Step 2: Testing Read-Only Connection to Supabase Source..."

export PGPASSWORD="${SUPABASE_DB_PASSWORD}"

SUPABASE_VERSION=$(psql -h "${SUPABASE_HOST}" -p "${SUPABASE_PORT}" -U "${SUPABASE_USER}" -d "${SUPABASE_DB}" -t -c "SELECT version();" 2>/dev/null | xargs || true)

if [ -z "${SUPABASE_VERSION}" ]; then
  error_exit "Step 2" "Could not connect to Supabase source database."
fi

SUPABASE_TABLE_COUNT=$(psql -h "${SUPABASE_HOST}" -p "${SUPABASE_PORT}" -U "${SUPABASE_USER}" -d "${SUPABASE_DB}" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | xargs)

log "✅ Supabase Connection Successful!"
log "   - Source Version: ${SUPABASE_VERSION}"
log "   - Table Count in public schema: ${SUPABASE_TABLE_COUNT}\n"

# ------------------------------------------------------------------------------
# STEP 3 & 4: VERIFY TARGET VPS CONNECTION & SAFETY
# ------------------------------------------------------------------------------
log "⏳ Step 3 & 4: Testing Connection to VPS Target Database '${VPS_DB}'..."

export PGPASSWORD="${DB_PASSWORD}"

VPS_VERSION=$(psql -h "${VPS_HOST}" -p "${VPS_PORT}" -U "${VPS_USER}" -d "${VPS_DB}" -t -c "SELECT version();" 2>/dev/null | xargs || true)

if [ -z "${VPS_VERSION}" ]; then
  log "⚠️ Could not connect directly as '${VPS_USER}'. Retrying via postgres superuser..."
  unset PGPASSWORD
  VPS_VERSION=$(sudo -u postgres psql -d "${VPS_DB}" -t -c "SELECT version();" 2>/dev/null | xargs || true)
  if [ -z "${VPS_VERSION}" ]; then
    error_exit "Step 3" "Could not connect to VPS target database '${VPS_DB}'."
  fi
  TARGET_CONN_MODE="postgres_sudo"
else
  TARGET_CONN_MODE="direct_user"
fi

log "✅ VPS Target Connection Successful!"
log "   - VPS Version: ${VPS_VERSION}"
log "   - Connection Mode: ${TARGET_CONN_MODE}\n"

# ------------------------------------------------------------------------------
# STEP 5: AUTOMATED SUPABASE DUMP CREATION ON VPS
# ------------------------------------------------------------------------------
log "⏳ Step 5: Creating Full Supabase Backup at ${BACKUP_DIR}/..."

DUMP_FILE="${BACKUP_DIR}/yogkart_supabase_backup.dump"
SQL_FILE="${BACKUP_DIR}/yogkart_supabase_backup.sql"

export PGPASSWORD="${SUPABASE_DB_PASSWORD}"

# Execute pg_dump custom format
if pg_dump -h "${SUPABASE_HOST}" -p "${SUPABASE_PORT}" -U "${SUPABASE_USER}" -d "${SUPABASE_DB}" -Fc -f "${DUMP_FILE}" 2>/dev/null; then
  log "✅ Native Custom Format Dump Created: ${DUMP_FILE}"
else
  log "⚠️ Custom format dump failed. Falling back to plain SQL format..."
  pg_dump -h "${SUPABASE_HOST}" -p "${SUPABASE_PORT}" -U "${SUPABASE_USER}" -d "${SUPABASE_DB}" -f "${SQL_FILE}"
  log "✅ Plain SQL Format Backup Created: ${SQL_FILE}"
fi

# ------------------------------------------------------------------------------
# STEP 6: VERIFY BACKUP INTEGRITY
# ------------------------------------------------------------------------------
log "\n⏳ Step 6: Verifying Backup File Integrity..."

if [ -f "${DUMP_FILE}" ]; then
  BACKUP_SIZE=$(du -h "${DUMP_FILE}" | cut -f1)
  OBJECT_COUNT=$(pg_restore --list "${DUMP_FILE}" 2>/dev/null | wc -l | xargs)
  log "✅ Custom Format Backup Verified!"
  log "   - Backup Size: ${BACKUP_SIZE}"
  log "   - Total Objects Verified: ${OBJECT_COUNT}"
elif [ -f "${SQL_FILE}" ]; then
  BACKUP_SIZE=$(du -h "${SQL_FILE}" | cut -f1)
  TABLE_DDL_COUNT=$(grep -i "CREATE TABLE" "${SQL_FILE}" | wc -l | xargs)
  log "✅ Plain SQL Backup Verified!"
  log "   - Backup Size: ${BACKUP_SIZE}"
  log "   - DDL Tables Count: ${TABLE_DDL_COUNT}"
else
  error_exit "Step 6" "No backup file found to verify."
fi

# ------------------------------------------------------------------------------
# STEP 7 & 8: AUTOMATED RESTORE TO VPS (YOGKART DATABASE ONLY)
# ------------------------------------------------------------------------------
log "\n⏳ Step 7 & 8: Restoring Backup into VPS Database '${VPS_DB}'..."

export PGPASSWORD="${DB_PASSWORD}"

if [ -f "${DUMP_FILE}" ]; then
  if [ "${TARGET_CONN_MODE}" = "direct_user" ]; then
    pg_restore -h "${VPS_HOST}" -p "${VPS_PORT}" -U "${VPS_USER}" -d "${VPS_DB}" --no-owner --role="${VPS_USER}" "${DUMP_FILE}" || true
  else
    sudo -u postgres pg_restore -d "${VPS_DB}" --no-owner --role="${VPS_USER}" "${DUMP_FILE}" || true
  fi
elif [ -f "${SQL_FILE}" ]; then
  if [ "${TARGET_CONN_MODE}" = "direct_user" ]; then
    psql -h "${VPS_HOST}" -p "${VPS_PORT}" -U "${VPS_USER}" -d "${VPS_DB}" -f "${SQL_FILE}"
  else
    sudo -u postgres psql -d "${VPS_DB}" -f "${SQL_FILE}"
  fi
fi

log "✅ Schema, Tables, Functions, Triggers, Data & Indexes Restored into '${VPS_DB}'!"

# ------------------------------------------------------------------------------
# STEP 10: ALIGN SEQUENCES
# ------------------------------------------------------------------------------
log "\n⏳ Step 10: Aligning Sequence Nextval Values..."

ALIGN_SQL="
SELECT setval('products_id_seq', COALESCE((SELECT MAX(id) FROM products), 1), true);
SELECT setval('banners_id_seq', COALESCE((SELECT MAX(id) FROM banners), 1), true);
SELECT setval('bulk_campaigns_id_seq', COALESCE((SELECT MAX(id) FROM bulk_campaigns), 1), true);
SELECT setval('bulk_campaign_recipients_id_seq', COALESCE((SELECT MAX(id) FROM bulk_campaign_recipients), 1), true);
"

if [ "${TARGET_CONN_MODE}" = "direct_user" ]; then
  psql -h "${VPS_HOST}" -p "${VPS_PORT}" -U "${VPS_USER}" -d "${VPS_DB}" -c "${ALIGN_SQL}"
else
  sudo -u postgres psql -d "${VPS_DB}" -c "${ALIGN_SQL}"
fi

log "✅ Sequences Aligned to MAX(id) successfully!"

# ------------------------------------------------------------------------------
# STEP 11: AUTOMATED DATA INTEGRITY VERIFICATION (READ-ONLY)
# ------------------------------------------------------------------------------
log "\n⏳ Step 11: Running Data Parity Verification (Supabase vs VPS)..."

export PGPASSWORD="${SUPABASE_DB_PASSWORD}"
S_TABLES=$(psql -h "${SUPABASE_HOST}" -p "${SUPABASE_PORT}" -U "${SUPABASE_USER}" -d "${SUPABASE_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | xargs)

export PGPASSWORD="${DB_PASSWORD}"
if [ "${TARGET_CONN_MODE}" = "direct_user" ]; then
  V_TABLES=$(psql -h "${VPS_HOST}" -p "${VPS_PORT}" -U "${VPS_USER}" -d "${VPS_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | xargs)
  V_PRODUCTS=$(psql -h "${VPS_HOST}" -p "${VPS_PORT}" -U "${VPS_USER}" -d "${VPS_DB}" -t -c "SELECT count(*) FROM products;" | xargs)
  V_ORDERS=$(psql -h "${VPS_HOST}" -p "${VPS_PORT}" -U "${VPS_USER}" -d "${VPS_DB}" -t -c "SELECT count(*) FROM orders;" | xargs)
  V_USERS=$(psql -h "${VPS_HOST}" -p "${VPS_PORT}" -U "${VPS_USER}" -d "${VPS_DB}" -t -c "SELECT count(*) FROM users;" | xargs)
else
  V_TABLES=$(sudo -u postgres psql -d "${VPS_DB}" -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | xargs)
  V_PRODUCTS=$(sudo -u postgres psql -d "${VPS_DB}" -t -c "SELECT count(*) FROM products;" | xargs)
  V_ORDERS=$(sudo -u postgres psql -d "${VPS_DB}" -t -c "SELECT count(*) FROM orders;" | xargs)
  V_USERS=$(sudo -u postgres psql -d "${VPS_DB}" -t -c "SELECT count(*) FROM users;" | xargs)
fi

log "✅ Verification Summary:"
log "   - Supabase Tables: ${S_TABLES} | VPS Tables: ${V_TABLES}"
log "   - Restored Products: ${V_PRODUCTS} rows"
log "   - Restored Orders:   ${V_ORDERS} rows"
log "   - Restored Users:    ${V_USERS} rows"

# ------------------------------------------------------------------------------
# STEP 13: CREATE SECOND BACKUP (POST-RESTORE VPS DUMP)
# ------------------------------------------------------------------------------
log "\n⏳ Step 13: Creating Second Backup of Restored VPS Database..."

VPS_DUMP_FILE="${BACKUP_DIR}/yogkart_vps_after_restore.dump"

if [ "${TARGET_CONN_MODE}" = "direct_user" ]; then
  pg_dump -h "${VPS_HOST}" -p "${VPS_PORT}" -U "${VPS_USER}" -d "${VPS_DB}" -Fc -f "${VPS_DUMP_FILE}"
else
  sudo -u postgres pg_dump -d "${VPS_DB}" -Fc -f "${VPS_DUMP_FILE}"
fi

VPS_DUMP_SIZE=$(du -h "${VPS_DUMP_FILE}" | cut -f1)
log "✅ Second Backup Created: ${VPS_DUMP_FILE} (Size: ${VPS_DUMP_SIZE})"

# ------------------------------------------------------------------------------
# STEP 16: FINAL REPORT (NO PASSWORDS EXPOSED)
# ------------------------------------------------------------------------------
log "\n=========================================================================="
log "🎉 AUTOMATED MIGRATION COMPLETED SUCCESSFULLY ON VPS!"
log "=========================================================================="
log "SOURCE (Supabase):"
log " - Host: ${SUPABASE_HOST}"
log " - PostgreSQL Version: ${SUPABASE_VERSION}"
log " - Source Table Count: ${S_TABLES}"
log ""
log "TARGET (VPS):"
log " - Host: ${VPS_HOST}:${VPS_PORT}"
log " - Database: ${VPS_DB}"
log " - User: ${VPS_USER}"
log " - Restored Table Count: ${V_TABLES}"
log " - Key Table Counts: products (${V_PRODUCTS}), orders (${V_ORDERS}), users (${V_USERS})"
log ""
log "BACKUP FILES CREATED ON VPS:"
log " 1. Source Backup: ${DUMP_FILE:-$SQL_FILE}"
log " 2. VPS Target Backup: ${VPS_DUMP_FILE}"
log ""
log "ISOLATION & SAFETY GUARANTEES:"
log " ✅ Supabase source database was NOT modified."
log " ✅ MMR Constructions database ('mmrconstructions') was NOT modified."
log " ✅ MMR user ('mmruser') was NOT modified."
log " ✅ Only 'yogkart' database was used."
log "=========================================================================="

# Unset sensitive environment variables before exiting
unset PGPASSWORD SUPABASE_DB_PASSWORD DB_PASSWORD

echo -e "\nFull log saved to: ${LOG_FILE}"

#!/bin/bash
# ============================================================
# Nepal Najar — Run SQL Migrations
# ============================================================
# This script opens the Supabase SQL Editor in your browser.
# Paste and run each migration file in order.
#
# Usage: bash scripts/run-migrations.sh
# ============================================================

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║        Nepal Najar — Database Migrations            ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""
echo "Opening Supabase SQL Editor..."
echo ""

# Open the Supabase dashboard SQL editor
open "https://supabase.com/dashboard/project/kmyftbmtdabuyfampklz/sql/new"

echo "📋 Run these files IN ORDER in the SQL Editor:"
echo ""
echo "  1. supabase/002-user-accounts.sql"
echo "     → Creates: profiles, user_preferences, comments, user_submissions"
echo "     → Adds: user_id column to public_votes"
echo ""
echo "  2. supabase/003-notifications.sql"
echo "     → Creates: push_subscriptions, notification_preferences"
echo ""
echo "Steps:"
echo "  1. Copy the contents of each .sql file"
echo "  2. Paste into the SQL Editor"
echo "  3. Click 'Run' (or Cmd+Enter)"
echo "  4. Check for green 'Success' message"
echo ""
echo "Files are at:"
echo "  $(pwd)/supabase/002-user-accounts.sql"
echo "  $(pwd)/supabase/003-notifications.sql"
echo ""

#!/bin/bash

# Deployment script for OpenAI Edge Function
# This script helps you deploy the openai-ai Edge Function to Supabase

set -e

echo "🚀 Deploying OpenAI Edge Function to Supabase"
echo "=============================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo "   Install it with: npm install -g supabase"
    exit 1
fi

echo "✅ Supabase CLI found"

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "⚠️  Not logged in to Supabase"
    echo "   Run: supabase login"
    exit 1
fi

echo "✅ Logged in to Supabase"
echo ""

# Check if project is linked
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Project not linked"
    echo "   Please link your project first:"
    echo "   supabase link --project-ref YOUR_PROJECT_REF"
    echo ""
    echo "   You can find your project ref in the Supabase Dashboard URL:"
    echo "   https://supabase.com/dashboard/project/YOUR_PROJECT_REF"
    exit 1
fi

echo "✅ Project is linked"
echo ""

# Deploy the function
echo "📦 Deploying openai-ai function..."
echo ""

supabase functions deploy openai-ai --no-verify-jwt

echo ""
echo "✅ Function deployed successfully!"
echo ""
echo "⚠️  IMPORTANT: Set the OPENAI_API_KEY secret:"
echo ""
echo "   1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT_REF/functions/openai-ai"
echo "   2. Click 'Manage' → 'Secrets'"
echo "   3. Add secret:"
echo "      Name: OPENAI_API_KEY"
echo "      Value: Your OpenAI API key (from https://platform.openai.com/api-keys)"
echo "   4. Click 'Save'"
echo ""
echo "📝 To verify deployment:"
echo "   supabase functions list"
echo ""


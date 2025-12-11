#!/bin/bash

# Deploy All AI Edge Functions for GhostInbox
# This script deploys all AI-related Supabase Edge Functions

set -e  # Exit on error

echo "🚀 Deploying AI Edge Functions for GhostInbox..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo ""
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase!"
    echo "Please login first:"
    echo "  supabase login"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI found and logged in"
echo ""

# Functions to deploy
FUNCTIONS=(
    "ai-moderation-enhanced"
    "ai-priority-enhanced"
    "ai-categorization-webhook"
    "openai-ai"
)

# Deploy each function
for func in "${FUNCTIONS[@]}"; do
    echo "📦 Deploying $func..."
    if supabase functions deploy "$func"; then
        echo "✅ $func deployed successfully!"
    else
        echo "❌ Failed to deploy $func"
        exit 1
    fi
    echo ""
done

echo "🎉 All AI functions deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in Supabase Dashboard:"
echo "   - Go to: Project Settings → Edge Functions → Secrets"
echo "   - Add: OPENAI_API_KEY (your OpenAI API key)"
echo "   - Add: SUPABASE_SERVICE_ROLE_KEY (your service role key)"
echo ""
echo "2. Run database setup scripts in Supabase SQL Editor:"
echo "   - supabase/enhanced_moderation_schema.sql"
echo "   - supabase/ai_features_schema.sql"
echo "   - supabase/message_folders_schema.sql"
echo "   - supabase/ai_moderation_setup.sql"
echo "   - supabase/ai_categorization_setup.sql"
echo "   - supabase/ai_priority_setup.sql"
echo ""
echo "3. Verify deployment:"
echo "   supabase functions list"
echo ""
echo "📚 See DEPLOY_AI_FUNCTIONS.md for detailed instructions"

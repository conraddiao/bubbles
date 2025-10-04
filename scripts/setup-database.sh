#!/bin/bash

# Database setup script for Shared Contact Groups
# This script helps set up the database schema locally or in production

set -e

echo "🚀 Setting up Shared Contact Groups database..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "   npm install -g supabase"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

# Check if supabase directory exists
if [ ! -d "supabase" ]; then
    echo "❌ Supabase directory not found. Please ensure the migration files are in place."
    exit 1
fi

echo "📋 Available commands:"
echo "  local   - Set up local development database"
echo "  prod    - Deploy to production (requires linking)"
echo "  reset   - Reset local database"
echo "  status  - Check migration status"

if [ $# -eq 0 ]; then
    echo "Please specify a command: local, prod, reset, or status"
    exit 1
fi

case $1 in
    "local")
        echo "🔧 Setting up local development environment..."
        
        # Start Supabase if not running
        echo "Starting Supabase services..."
        supabase start
        
        # Reset database with migrations
        echo "Applying database migrations..."
        supabase db reset
        
        echo "✅ Local database setup complete!"
        echo "📊 Access Supabase Studio at: http://localhost:54323"
        echo "🔗 API URL: http://localhost:54321"
        echo ""
        echo "Make sure to update your .env.local file with:"
        echo "NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321"
        echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>"
        echo "SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>"
        ;;
        
    "prod")
        echo "🚀 Deploying to production..."
        
        # Check if project is linked
        if [ ! -f ".supabase/config.toml" ]; then
            echo "❌ Project not linked to Supabase. Please run:"
            echo "   supabase link --project-ref YOUR_PROJECT_REF"
            exit 1
        fi
        
        # Push migrations to production
        echo "Pushing migrations to production..."
        supabase db push
        
        echo "✅ Production database setup complete!"
        ;;
        
    "reset")
        echo "🔄 Resetting local database..."
        supabase db reset
        echo "✅ Local database reset complete!"
        ;;
        
    "status")
        echo "📊 Checking migration status..."
        supabase migration list
        ;;
        
    *)
        echo "❌ Unknown command: $1"
        echo "Available commands: local, prod, reset, status"
        exit 1
        ;;
esac
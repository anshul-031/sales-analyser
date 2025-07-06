#!/bin/bash

# Test script to verify timeout configuration
echo "🔍 Testing Timeout Configuration..."

# Check if environment variables are set
echo "📊 Current timeout configuration:"
echo "  TRANSCRIPTION_TIMEOUT_MS: ${TRANSCRIPTION_TIMEOUT_MS:-1800000} (default: 30 minutes)"
echo "  ANALYSIS_TIMEOUT_MS: ${ANALYSIS_TIMEOUT_MS:-2700000} (default: 45 minutes)"
echo "  GEMINI_API_TIMEOUT_MS: ${GEMINI_API_TIMEOUT_MS:-2700000} (default: 45 minutes)"
echo "  LONG_RUNNING_TIMEOUT_MS: ${LONG_RUNNING_TIMEOUT_MS:-3600000} (default: 1 hour)"

# Check if the application starts without errors
echo "🚀 Starting application health check..."
if npm run dev > /dev/null 2>&1 & then
    APP_PID=$!
    sleep 5
    
    # Test if health endpoint responds
    if curl -s "http://localhost:3000/api/health" > /dev/null; then
        echo "✅ Application started successfully with new timeout configuration"
        
        # Check if timeout values are loaded correctly
        echo "🔧 Checking timeout configuration endpoint..."
        TIMEOUT_CONFIG=$(curl -s "http://localhost:3000/api/health" | jq -r '.timeouts // empty')
        
        if [ -n "$TIMEOUT_CONFIG" ]; then
            echo "✅ Timeout configuration loaded successfully"
            echo "   Current timeouts: $TIMEOUT_CONFIG"
        else
            echo "⚠️  Timeout configuration not found in health check"
        fi
    else
        echo "❌ Application failed to start properly"
    fi
    
    # Clean up
    kill $APP_PID 2>/dev/null
else
    echo "❌ Failed to start application"
fi

echo "✨ Test completed!"

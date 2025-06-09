# Google Gemini API Setup Guide

## Quick Setup Instructions

### 1. Get Your Google Gemini API Key

1. **Visit Google AI Studio**: Go to [https://aistudio.google.com/](https://aistudio.google.com/)
2. **Sign in** with your Google account
3. **Create API Key**: 
   - Click "Get API key" in the top menu
   - Click "Create API key in new project" (or select existing project)
   - Copy the generated API key

### 2. Configure the Application

1. **Open the `.env` file** in the project root
2. **Replace the placeholder** with your actual API key:
   ```env
   GOOGLE_GEMINI_API_KEY=your_actual_api_key_here
   ```
3. **Save the file**

### 3. Start the Application

```bash
npm run dev
```

## Important Notes

### API Key Security
- ✅ **Never commit** your API key to version control
- ✅ **Keep it private** - don't share it publicly
- ✅ **Use environment variables** (already configured)

### Model Information
- **Model Used**: `gemini-2.0-flash-exp` (Gemini 2.0 Flash Experimental)
- **Capabilities**: Audio transcription and text analysis
- **Pricing**: Check [Google AI pricing](https://ai.google.dev/pricing) for current rates

### Troubleshooting

**Common Issues:**

1. **"API key not valid" Error**
   - Double-check your API key is correctly copied
   - Ensure no extra spaces or quotes
   - Verify the key is active in Google AI Studio

2. **"Model not found" Error**
   - The `gemini-2.0-flash-exp` model might not be available in your region
   - Try `gemini-1.5-flash` as an alternative by updating `src/lib/gemini.ts`

3. **Rate Limiting**
   - Check your API quotas in Google AI Studio
   - Consider upgrading your plan if needed

### Testing the Setup

Once configured, you can:

1. **Upload an audio file** (MP3, WAV, etc.)
2. **Watch automatic analysis** begin
3. **View real-time results** as processing completes

### API Usage

The application uses the Gemini API for:
- **Audio Transcription**: Converting speech to text
- **Sales Analysis**: Analyzing transcribed calls for performance metrics
- **Custom Analysis**: Processing with custom prompts

## Getting Started

After setting up your API key:

```bash
# Install dependencies (if not already done)
npm install

# Start the development server
npm run dev

# Open http://localhost:3000
# Upload an audio file and watch the magic happen!
```

## Support

If you encounter issues:
1. Check the [Google AI Studio documentation](https://ai.google.dev/docs)
2. Verify your API key permissions
3. Check the application logs for detailed error messages

---

**Ready to analyze your sales calls with AI? 🚀**
# AI Call Performance Analyzer

A modern AI-powered call analysis application built with Next.js and Google Gemini AI. Analyze call recordings to improve performance with detailed insights and actionable recommendations.

## ✨ Features

- **🎯 AI-Powered Analysis**: Google Gemini integration for transcription and intelligent analysis
- **📊 Comprehensive Framework**: 5-area call performance evaluation
- **🎨 Custom Analysis**: User-defined analysis criteria and prompts
- **🤖 AI Chat Assistant**: Interactive chatbot to ask questions about your call recordings
- **💾 File-Based Storage**: No database required - works out of the box
- **📱 Modern UI**: Responsive design with real-time updates
- **🔄 Background Processing**: Non-blocking analysis with live status updates
- **📥 Export Functionality**: Download detailed analysis reports
- **📊 Analytics & Performance**: Vercel Analytics for insights and Core Web Vitals monitoring
- **👨‍💻 GitHub Copilot Ready**: Custom instructions and templates for enhanced AI-assisted development

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Google Gemini API key ([Get one here](https://aistudio.google.com/app/apikey))

### Installation

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd ai-call-analyser
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env and add your Google Gemini API key
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open Application**
   ```
   http://localhost:3000
   ```

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Deploy to Vercel**
   ```bash
   npm install -g vercel
   vercel --prod
   ```

2. **Configure Environment Variables**
   In your Vercel dashboard, add:
   ```env
   GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
   MAX_FILE_SIZE=52428800
   AUTO_DELETE_FILES=true
   ```

3. **Deployment Notes**
   - Vercel automatically sets `VERCEL_URL` environment variable
   - Application uses relative URLs for internal API calls
   - No additional configuration needed for file storage
   - **Analytics**: Vercel Analytics automatically enabled on deployment
   - **Performance Monitoring**: Speed Insights tracks Core Web Vitals

### Other Platforms

For other platforms (Railway, Heroku, etc.), ensure:
- Node.js 18+ runtime
- Environment variables are properly set
- File system write permissions (for uploads and data directories)

### Deployment Troubleshooting

**Common Issues:**

**❌ API calls failing with ECONNREFUSED localhost:3000**
- **Cause**: Application trying to make internal calls to localhost
- **Solution**: Ensure `VERCEL_URL` or `NEXTAUTH_URL` is properly set
- **Fixed**: Application now auto-detects deployment URL

**❌ File upload errors**
- **Cause**: Missing write permissions or directories
- **Solution**: Ensure `/tmp` directory access (handled automatically)

**❌ Environment variables not loaded**
- **Cause**: Missing environment configuration
- **Solution**: Set all required environment variables in deployment platform

## 🔧 Environment Configuration

Create a `.env` file with the following variables:

```env
# Required: Google Gemini AI Configuration (Multiple API Keys for Round-Robin)
# Use JSON array format to support multiple API keys for rate limit management
GOOGLE_GEMINI_API_KEYS=["your_first_api_key_here", "your_second_api_key_here"]

# Single API key example (still supported):
# GOOGLE_GEMINI_API_KEYS=["your_single_api_key_here"]

# Optional: Application Configuration
NEXTAUTH_SECRET=your-nextauth-secret-here
MAX_FILE_SIZE=5242880
UPLOAD_DIR=./uploads

# File Management
AUTO_DELETE_FILES=true
```

### 🔑 Multiple API Key Support

The application now supports **multiple Google Gemini API keys** for improved rate limit handling:

- **Round-Robin**: Automatically rotates between API keys
- **Rate Limit Protection**: Switches keys when quotas are exceeded
- **Fault Tolerance**: Continues working if some keys fail
- **JSON Array Format**: Configure multiple keys as `["key1", "key2", "key3"]`

### Getting Your Gemini API Keys

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Create multiple API keys (recommended: 2-3 keys)
4. Add them to your `.env` file as a JSON array
5. **Pro Tip**: Use different Google accounts for separate quotas

**Example with multiple keys:**
```env
GOOGLE_GEMINI_API_KEYS=["AIzaSyC...key1", "AIzaSyD...key2", "AIzaSyE...key3"]
```

## 📁 File-Based Storage System

This application uses a **zero-dependency file-based storage system**:

```
sales-analyser/
├── data/
│   ├── uploads.json     # File metadata
│   └── analyses.json    # Analysis results
├── uploads/             # Audio files
└── ...
```

### Benefits

- ✅ **No Database Required**: Works immediately without setup
- ✅ **Zero External Dependencies**: No PostgreSQL, MongoDB, etc.
- ✅ **Portable**: Easy backup and migration
- ✅ **Transparent**: Human-readable JSON storage
- ✅ **Fast**: Quick setup and operation

## 🎯 How to Use

### 1. Upload Audio Files

- **Supported Formats**: MP3, WAV, M4A, AAC, OGG, FLAC, WebM
- **File Size Limit**: 5MB per file
- **Upload Method**: Drag & drop or click to select

### 2. Choose Analysis Type

**Default Analysis** (Recommended)
- Communication Skills
- Product Knowledge  
- Customer Needs Analysis
- Closing Techniques
- Overall Performance

**Custom Analysis**
- Define your own analysis criteria
- Tailored insights for specific needs

### 3. View Results

- **Real-time Updates**: Watch analysis progress
- **Detailed Insights**: Scores, strengths, improvements
- **Actionable Recommendations**: Specific steps for improvement
- **Full Transcription**: Complete call transcript
- **Export Options**: Download as JSON

### 4. Use AI Chat Assistant

- **Interactive Q&A**: Ask questions about your call recordings
- **Contextual Insights**: Get specific answers based on transcription and analysis
- **Smart Recommendations**: Receive personalized improvement suggestions
- **Multi-Call Analysis**: Compare and analyze across multiple recordings

**Example Questions:**
- "What were my main strengths in this call?"
- "How can I improve my closing techniques?"
- "What objections did the customer raise?"
- "Compare my performance across all calls"
- "Give me specific examples of good communication"

## 📊 Analysis Framework

### Default Analysis Areas

1. **Communication Skills** (1-10 score)
   - Clarity and articulation
   - Active listening skills
   - Professional tone
   - Rapport building

2. **Product Knowledge** (1-10 score)
   - Accuracy of information
   - Confidence in presentation
   - Technical detail handling
   - Question answering

3. **Customer Needs Analysis** (1-10 score)
   - Discovery questions
   - Pain point identification
   - Solution alignment
   - Personalization

4. **Closing Techniques** (1-10 score)
   - Natural progression
   - Objection handling
   - Next steps clarity
   - Follow-up planning

5. **Overall Performance** (1-10 score)
   - Call structure
   - Objective achievement
   - Customer engagement
   - Professionalism

### Analysis Output

Each analysis provides:
- **Numerical Score** (1-10 for each area)
- **Summary** of performance
- **Strengths** with specific examples
- **Areas for Improvement** with actionable feedback
- **Recommendations** for skill development
- **Specific Examples** from the actual call

## 🗂️ File Management

### Automatic File Cleanup

The application can automatically delete uploaded audio files after successful analysis to save disk space:

**Configuration:**
```env
AUTO_DELETE_FILES=true  # Enable automatic cleanup (default: true)
AUTO_DELETE_FILES=false # Keep files after analysis
```

**Behavior:**
- ✅ **Auto-cleanup ON**: Files deleted immediately after successful analysis
- 🔄 **Auto-cleanup OFF**: Files preserved for future reference
- 📊 **Analysis preserved**: Analysis results always kept regardless of setting
- 🔐 **Transcription preserved**: Full transcription always available in results

### Manual File Management

**Get cleanup status:**
```bash
GET /api/cleanup?userId=user_123
```

**Delete specific file:**
```bash
DELETE /api/cleanup?uploadId=upload_123&userId=user_123
```

**Cleanup all completed analysis files:**
```bash
DELETE /api/cleanup?userId=user_123
```

### Storage Space Optimization

**Automatic (Recommended):**
- Set `AUTO_DELETE_FILES=true` in `.env`
- Files deleted after successful analysis
- Zero maintenance required

**Manual Control:**
- Set `AUTO_DELETE_FILES=false` in `.env`
- Use cleanup API endpoints when needed
- Full control over file retention

## 🔗 API Endpoints

### Upload Files
```bash
POST /api/upload
Content-Type: multipart/form-data

# Form fields:
# - files: audio file(s)
# - userId: user identifier
```

### Start Analysis
```bash
POST /api/analyze
Content-Type: application/json

{
  "uploadIds": ["upload_123"],
  "analysisType": "default",
  "userId": "user_123"
}
```

### Get Results
```bash
GET /api/analyze?userId=user_123
GET /api/analyze?analysisId=analysis_123
GET /api/upload?userId=user_123
```

### File Cleanup
```bash
GET /api/cleanup?userId=user_123                              # Get cleanup status
DELETE /api/cleanup?uploadId=upload_123&userId=user_123       # Delete specific file
DELETE /api/cleanup?userId=user_123                           # Cleanup all completed
```

### GraphQL Endpoint
```bash
POST /api/graphql
Content-Type: application/json

# Example Query:
# {
#   "query": "query { hello }"
# }
```

## 🧪 Testing

### Verify Setup
```bash
node test-setup.js
```

### Test File Storage
```bash
node test-file-system.js
```

### API Testing
Import `postman/Sales_Analyzer_API.postman_collection.json` into Postman for complete API testing.

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15.3.3, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **AI Integration**: Google Gemini 1.5 Flash
- **Storage**: File-based JSON storage
- **Icons**: Lucide React
- **File Upload**: React Dropzone
- **Analytics**: Vercel Analytics & Speed Insights

### Project Structure
```
src/
├── app/
│   ├── page.tsx                 # Main application UI
│   └── api/
│       ├── upload/route.ts      # File upload endpoint
│       └── analyze/route.ts     # Analysis endpoint
├── components/
│   ├── FileUpload.tsx           # Drag & drop file upload
│   ├── AnalysisConfig.tsx       # Analysis configuration
│   └── AnalysisResults.tsx      # Results display
└── lib/
    ├── file-storage.ts          # File-based data storage
    ├── gemini.ts                # AI service integration
    └── utils.ts                 # Utility functions
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

### Code Quality

- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **Error Handling**: Comprehensive error management
- **Logging**: Detailed operation logging

### 👨‍💻 GitHub Copilot Integration

This project includes comprehensive GitHub Copilot custom instructions to enhance AI-assisted development:

#### Custom Instructions
- **Project-specific guidelines**: Located in `.github/copilot-instructions.md`
- **Architecture context**: Detailed in `.github/copilot-context.md`
- **Code templates**: Available in `.github/copilot-templates.md`

#### VS Code Configuration
- **Optimized settings**: Enhanced Copilot settings in `.vscode/settings.json`
- **Extension recommendations**: Essential extensions in `.vscode/extensions.json`
- **Workspace configuration**: Project-specific setup in `sales-analyser.code-workspace`

#### Features
- **Smart code completion**: Context-aware suggestions for React, TypeScript, and Next.js
- **API route templates**: Consistent patterns for endpoint creation
- **Component scaffolding**: Pre-configured component structures
- **Error handling patterns**: Standardized error management
- **Tailwind CSS integration**: Optimized styling suggestions

#### Getting Started with Copilot
1. **Install GitHub Copilot**: Available in VS Code marketplace
2. **Open workspace**: Use `sales-analyser.code-workspace` file
3. **Enable extensions**: Install recommended extensions when prompted
4. **Start coding**: Copilot will provide context-aware suggestions

The custom instructions ensure Copilot understands:
- Project architecture and patterns
- TypeScript interfaces and types
- Gemini AI integration patterns
- File storage and memory management
- React component best practices
- API design conventions

## 📚 Advanced Usage

### Custom Analysis Prompts

Create tailored analysis by providing custom prompts:

```javascript
{
  "analysisType": "custom",
  "customPrompt": "Analyze this sales call focusing on objection handling and closing techniques. Provide specific recommendations for improvement."
}
```

### Batch Processing

Upload and analyze multiple files simultaneously:

```javascript
{
  "uploadIds": ["upload_1", "upload_2", "upload_3"],
  "analysisType": "default",
  "userId": "user_123"
}
```

### Export and Backup

- **Analysis Export**: Download complete analysis as JSON
- **Data Backup**: Copy `data/` and `uploads/` directories
- **Migration**: Move JSON files between environments

## 🔒 Security Considerations

- **File Validation**: Strict file type and size validation
- **Input Sanitization**: All inputs sanitized and validated
- **API Key Security**: Environment variable protection
- **File Access**: Controlled file system access

## 🐛 Troubleshooting

### Common Issues

**File Upload Fails**
- Check file size (max 50MB)
- Verify supported format (MP3, WAV, etc.)
- Ensure upload directory permissions

**Analysis Doesn't Start**
- Verify Google Gemini API key
- Check internet connection
- Review API quota limits

**Missing Files or Directories**
```bash
mkdir -p data uploads
chmod 755 data uploads
```

**Environment Issues**
```bash
node test-setup.js  # Verify configuration
```

### Getting Help

1. **Check Documentation**: Review this README, FILE_STORAGE_README.md, and VERCEL_ANALYTICS_SETUP.md
2. **Run Tests**: Use verification scripts
3. **Check Logs**: Review console output for detailed errors
4. **API Testing**: Use Postman collection for debugging
5. **Analytics**: Monitor performance and usage through Vercel Dashboard

## 📋 Roadmap

- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Team collaboration features
- [ ] Performance trend analysis
- [ ] Integration with CRM systems
- [ ] Custom scoring frameworks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Review the documentation
- Check the troubleshooting guide
- Run verification scripts
- Check console logs for detailed error information

---

**Sales Performance Analyzer** - Transform your sales calls into actionable insights with AI-powered analysis.

# GitHub Copilot Custom Instructions for AI Call Performance Analyzer

## Project Overview
This is an AI-powered call analysis application built with Next.js and Google Gemini AI. The system analyzes call recordings to provide performance insights and actionable recommendations for sales improvement.

## Tech Stack & Architecture
- **Frontend**: Next.js 15.3.3, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **AI Integration**: Google Gemini 1.5/2.5 Flash models
- **Storage**: File-based JSON storage (no database)
- **Icons**: Lucide React
- **File Upload**: React Dropzone
- **Analytics**: Vercel Analytics & Speed Insights

## Code Style Guidelines

### TypeScript Standards
- Use strict TypeScript typing
- Prefer interfaces over types for object definitions
- Always define return types for functions
- Use proper error handling with try-catch blocks
- Implement proper null/undefined checks

### React Best Practices
- Use functional components with hooks
- Implement proper state management with useState/useEffect
- Follow component composition patterns
- Use proper prop typing with TypeScript interfaces
- Implement loading states and error boundaries

### File Naming Conventions
- Components: PascalCase (e.g., `AnalysisResults.tsx`)
- API routes: lowercase with dashes (e.g., `analyze-transcription`)
- Utilities: camelCase (e.g., `gemini.ts`)
- Types: PascalCase with descriptive names

## Comprehensive Coding Standards

### Tech Stack Preferences
- **Framework**: Next.js (default for new projects)
- **Database**: PostgreSQL (preferred over other databases)
- **Object Storage**: Cloudflare R2 (when file storage required)
- **UI/UX**: Always ensure attractive, modern UI design
- **Code Segregation**: Maintain HTML, CSS, and TypeScript in separate files
- **Modularization**: Follow industry best practices for code organization

### Google Gemini API Integration
- **Multiple API Keys**: Support multiple Gemini API keys for rate limiting
- **Round Robin**: Use keys in round-robin fashion to increase throughput
- **Environment Format**: Store as array of strings in single environment variable
- **Rate Limiting**: Handle API quotas gracefully with automatic key rotation

```typescript
// Example: Multiple API keys configuration
GOOGLE_GEMINI_API_KEYS=["key1", "key2", "key3"]

// Implementation pattern
const getNextApiKey = () => {
  const keys = JSON.parse(process.env.GOOGLE_GEMINI_API_KEYS || '[]');
  return keys[currentKeyIndex++ % keys.length];
};
```

### Internationalization & Localization
- **Default Language**: English (all content loads in English by default)
- **Supported Languages**: 100+ most popular global languages
- **Language Storage**: User preference saved in settings
- **URL Parameters**: Support language switching via query parameters
- **Implementation**: Use i18n framework for complete translation support

### Authentication & Security
- **JWT Authentication**: 12-hour token validity
- **Protected Routes**: All pages require authentication except login, signup, reset password
- **Rate Limiting**: 100 requests per minute per user/IP
- **Environment Variables**: All sensitive data in backend environment files
- **Input Validation**: Comprehensive field validation everywhere

### Development Standards
- **Git Configuration**: Initialize with comprehensive .gitignore
- **Unit Testing**: 100% test coverage with comprehensive test framework
- **Swagger Documentation**: Auto-updating API documentation
- **Pre-commit Hooks**: Automated linting, testing, and formatting
- **Code Formatting**: Consistent formatting rules and settings
- **Linting**: Comprehensive ESLint configuration with zero warnings
- **Warning & Error Reduction**: Minimize warnings and errors through strict type checking
- **Code Quality**: Maintain clean code with proper documentation and comments

### Feature Management
- **Feature Flags**: Boolean-based feature toggle system
- **Environment-Specific**: Separate flag files for dev/staging/production
- **Dynamic Control**: Runtime feature enabling/disabling capability

```typescript
// Example: Feature flag structure
interface FeatureFlags {
  chatbotEnabled: boolean;
  paymentIntegration: boolean;
  socialLogin: boolean;
  advancedAnalytics: boolean;
}
```

### Payment & Verification
- **Payment Gateway**: RazorPay integration (when payment required)
- **Email Verification**: Mandatory email verification on signup
- **Mobile Verification**: OTP-based mobile number verification
- **3rd Party Login**: Google, Facebook, GitHub login (behind feature flags)

### API & Documentation
- **Postman Collections**: Environment files for local/dev/staging/production
- **Health Endpoints**: `/health` URL for uptime monitoring
- **API Versioning**: Proper versioning strategy for APIs
- **Proxy Configuration**: API proxy setup for development

### Deployment & Monitoring
- **Deployment Profiles**: dev, staging, production environments
- **Logging**: Detailed logging for debugging and monitoring
- **Error Handling**: Comprehensive error tracking and reporting
- **Performance**: Optimize for Core Web Vitals and accessibility

### UI/UX Standards
- **Theming**: Multiple color theme support (light/dark mode minimum)
- **Accessibility**: WCAG compliance and standard accessibility guidelines
- **Responsive Design**: Mobile-first responsive design approach
- **Feedback**: Always include feedback banner in footer
- **Loading States**: Consistent loading indicators and skeleton screens

### File Structure Example
```
src/
├── components/           # React components
├── pages/               # Next.js pages
├── api/                 # API routes
├── lib/                 # Utilities and services
├── styles/              # CSS/SCSS files
├── types/               # TypeScript type definitions
├── hooks/               # Custom React hooks
├── utils/               # Utility functions
├── constants/           # Application constants
├── config/              # Configuration files
├── tests/               # Test files
└── locales/             # Translation files
```

### Environment Configuration
- **Example Files**: Provide `.env.example` with all required variables
- **Documentation**: Clear documentation of all environment variables
- **Security**: Never commit actual environment values
- **Validation**: Runtime validation of required environment variables

## Project-Specific Patterns

### API Route Structure
```typescript
// Standard API response format
export async function POST(request: NextRequest) {
  try {
    // Implementation
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Error message'
    }, { status: 500 });
  }
}
```

### Component Props Interface
```typescript
interface ComponentProps {
  userId: string;
  analysisId?: string;
  uploadId?: string;
  onClose?: () => void;
}
```

### Error Handling Pattern
```typescript
try {
  // Implementation
} catch (error) {
  console.error('[Component] Error:', error);
  // User-friendly error state
}
```

## AI Integration Guidelines

### Gemini Service Usage
- Always use the `GeminiAnalysisService` class from `src/lib/gemini.ts`
- Handle API key rotation and rate limiting
- Implement proper error handling for AI service failures
- Use consistent prompt formatting for analysis

### Analysis Types
- `default`: Standard 5-area performance analysis
- `parameters`: Custom parameter-based analysis
- `custom`: Custom prompt analysis

## File Storage Patterns

### Memory Storage
- Use `src/lib/memory-storage.ts` for all data operations
- Follow the established JSON file structure
- Implement proper file cleanup based on `AUTO_DELETE_FILES` setting

### Upload Handling
- Support formats: MP3, WAV, M4A, AAC, OGG, FLAC, WebM
- Maximum file size: 5MB per file
- Use proper file validation and sanitization

## UI/UX Guidelines

### Design System
- Use Tailwind CSS with consistent color scheme
- Implement responsive design for mobile/desktop
- Follow the established component hierarchy
- Use Lucide React icons consistently

### Loading States
```typescript
const [isLoading, setIsLoading] = useState(false);
// Always implement loading indicators for async operations
```

### Form Handling
- Use proper form validation
- Implement real-time feedback
- Handle file uploads with progress indicators

## Security Considerations

### Environment Variables
- Always use environment variables for sensitive data
- Implement proper API key rotation
- Never expose API keys in client-side code

### Input Validation
- Sanitize all user inputs
- Validate file types and sizes
- Implement proper error boundaries

## Testing Patterns

### Unit Testing Standards
- **Coverage Target**: Maintain 100% test coverage across all metrics (statements, branches, functions, lines)
- **Fix Failing Tests**: Always fix any failing unit tests before proceeding with new features
- **Test-Driven Development**: Write tests for new functionality and ensure existing tests pass
- **Comprehensive Testing**: Cover all code paths, edge cases, and error scenarios

### Unit Test Structure
```typescript
// Example test file: ComponentName.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import ComponentName from './ComponentName';

describe('ComponentName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<ComponentName userId="test-user" />);
    expect(screen.getByTestId('component-name')).toBeInTheDocument();
  });

  it('should handle loading states correctly', async () => {
    render(<ComponentName userId="test-user" />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('should handle error states properly', async () => {
    // Mock error scenario
    jest.spyOn(console, 'error').mockImplementation(() => {});
    // Test error handling
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### API Route Testing
```typescript
// Example API test: api.test.ts
import { createMocks } from 'node-mocks-http';
import handler from './api/route';

describe('/api/endpoint', () => {
  it('should return success response with valid data', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: { userId: 'test-user' }
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(true);
  });

  it('should handle missing parameters', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {}
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(400);
    const data = JSON.parse(res._getData());
    expect(data.success).toBe(false);
  });
});
```

### Service Layer Testing
```typescript
// Example service test: gemini.test.ts
import { GeminiAnalysisService } from './gemini';

describe('GeminiAnalysisService', () => {
  let service: GeminiAnalysisService;

  beforeEach(() => {
    service = new GeminiAnalysisService();
  });

  it('should analyze with default parameters', async () => {
    const transcription = 'test transcription';
    const result = await service.analyzeWithDefaultParameters(transcription);
    
    expect(result).toHaveProperty('overallScore');
    expect(result).toHaveProperty('parameters');
    expect(typeof result.overallScore).toBe('number');
  });

  it('should handle API errors gracefully', async () => {
    // Mock API failure
    jest.spyOn(service, 'analyzeWithDefaultParameters')
        .mockRejectedValue(new Error('API Error'));
    
    await expect(service.analyzeWithDefaultParameters('test'))
        .rejects.toThrow('API Error');
  });
});
```

### Testing Requirements
- **All New Code**: Must include corresponding unit tests
- **Coverage Metrics**: Ensure 100% coverage for:
  - Statements coverage
  - Branch coverage
  - Function coverage
  - Line coverage
- **Error Scenarios**: Test all error paths and edge cases
- **Async Operations**: Proper testing of promises and async/await
- **Mocking**: Mock external dependencies (APIs, file system, etc.)
- **Integration Points**: Test component interactions and data flow

### Test Commands to Auto-Approve
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run test:ci` - Run tests in CI mode
- `npm run build` - Build the application
- `npm run lint` - Run linting
- `npm run lint:fix` - Fix linting issues

### API Testing
- Use the Postman collection in `/postman/` directory
- Test all endpoints with proper error scenarios
- Validate response formats

### Component Testing
- Test loading states and error conditions
- Mock external dependencies (Gemini API)
- Test user interactions and form submissions
- Use React Testing Library best practices
- Test accessibility and keyboard navigation

## Documentation Standards

### Code Comments
- Use clear, descriptive comments for complex logic
- Document API endpoints with JSDoc format
- Explain business logic and AI integration points

### README Updates
- Keep feature documentation current
- Update API endpoint documentation
- Maintain troubleshooting guides

## Common Patterns to Follow

### Action Items Feature
- Store action items with proper `typeId` linking
- Implement CRUD operations for action item management
- Use consistent status/priority enums

### Chatbot Integration
- Use context-aware responses
- Implement proper conversation history
- Handle multiple data sources (analysis/upload/all)

### Analysis Pipeline
1. File Upload → 2. Transcription → 3. Analysis → 4. Storage
- Always follow this sequence
- Implement proper error handling at each step
- Provide real-time progress updates

### Polling Patterns
- **Global Polling Manager**: Use singleton pattern for coordinating multiple pollers
- **Rate Limiting**: Implement global rate limiting (minimum 1-2 minutes between polls)
- **Visibility Checks**: Only poll when component is visible and enabled
- **Resource Management**: Proper cleanup and registration/deregistration of pollers
- **Conservative Intervals**: Use longer intervals (2+ minutes) to avoid API abuse

```typescript
// Example: usePolling hook usage
const { isPolling, stopPolling, pollCount } = usePolling({
  interval: 120000, // 2 minutes minimum
  maxDuration: 600000, // 10 minutes max
  enabled: shouldPoll,
  isVisible: isComponentVisible,
  onPoll: async () => {
    await fetchLatestData();
  },
  onStop: () => {
    console.log('Polling stopped');
  }
});
```

## Performance Optimization

### File Handling
- Implement audio compression where appropriate
- Use streaming for large file operations
- Clean up temporary files after processing

### API Optimization
- Implement request throttling
- Use proper caching strategies
- Handle rate limiting gracefully

## Deployment Considerations

### Environment Setup
- Ensure all required environment variables are set
- Test with multiple Gemini API keys for rate limiting
- Verify file storage permissions

### Monitoring
- Use proper logging for debugging
- Implement error tracking
- Monitor API usage and costs

---

## Copilot Auto-Approval Guidelines

### Command Preference Instructions
When suggesting terminal commands, GitHub Copilot should follow these guidelines:

1. **Prefer Auto-Approved Commands**: Always prefer commands from the auto-approval list over commands that require manual approval when multiple options are available to accomplish the same task.

2. **Auto-Approval Suggestion Prompt**: When suggesting a terminal command that is NOT in the current auto-approval list, ask the user:
   ```
   "This command requires manual approval. Would you like me to add '[COMMAND]' to the auto-approval list for future use? (y/n)"
   ```

3. **Command Selection Priority**:
   - **First Choice**: Use auto-approved commands whenever possible
   - **Second Choice**: Suggest manual approval commands only when necessary
   - **Always Ask**: Before executing any command not in the auto-approval list

4. **Documentation Updates**: When new commands are approved for auto-execution, automatically update this documentation file to include them in the appropriate category.

### Safe Commands to Auto-Execute
When Copilot suggests these commands, they can be automatically approved and executed:

#### Build & Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run preview` - Preview production build

#### Testing Commands
- `npm run test` - Run all unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate test coverage report
- `npm run test:ci` - Run tests in CI mode
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests
- `npm run test:e2e` - Run end-to-end tests

#### Code Quality Commands
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run type-check` - Run TypeScript type checking
- `npm run format` - Format code with Prettier

#### Package Management Commands
- `npm install` - Install dependencies
- `npm ci` - Clean install from package-lock.json
- `npm audit` - Check for security vulnerabilities
- `npm audit fix` - Fix security vulnerabilities
- `npm outdated` - Check for outdated packages

#### Git Commands (Read-only)
- `git status` - Check repository status
- `git log --oneline` - View commit history
- `git diff` - View changes
- `git branch` - List branches
- `git log --graph --oneline --all` - View branch history
- `git show` - Show commit details
- `git ls-files` - List tracked files

#### File System Commands (Read-only)
- `ls` / `ls -la` - List directory contents
- `pwd` - Show current directory
- `cat filename` - Display file contents
- `head filename` - Show first lines of file
- `tail filename` - Show last lines of file
- `grep pattern filename` - Search in files
- `find . -name "pattern"` - Find files by name
- `wc -l filename` - Count lines in file

#### Environment & System Info
- `node --version` - Check Node.js version
- `npm --version` - Check npm version
- `which node` - Find Node.js path
- `echo $NODE_ENV` - Check environment variable
- `env | grep NODE` - Show Node-related environment variables

### Commands Requiring Manual Approval
These commands should always require explicit user confirmation:

#### Destructive Operations
- `npm run db:reset` - Reset database
- `rm -rf` - Delete files/directories
- `git reset --hard` - Reset git history
- `git push --force` - Force push to repository

#### Deployment Commands
- `npm run deploy` - Deploy to production
- `vercel --prod` - Deploy to Vercel production
- Any cloud deployment commands

#### File System Operations
- Commands that modify files outside the project directory
- Commands that delete or move important files
- Commands that change permissions

### Testing Command Patterns
```bash
# These patterns should be auto-approved
npm run test*
npm test*
jest*
npm run coverage*
npm run lint*

# Safe build commands
npm run build*
npm run dev*
npm run start*

# Safe file operations
ls*
cat*
head*
tail*
grep*
find*
wc*

# Safe git operations
git status*
git log*
git diff*
git show*
git branch*
git ls-files*

# Safe system info
node --version*
npm --version*
which*
echo $*
env | grep*
```

### Test Commands to Auto-Approve
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Generate coverage report
- `npm run test:ci` - Run tests in CI mode
- `npm run build` - Build the application
- `npm run lint` - Run linting
- `npm run lint:fix` - Fix linting issues

When working on this project, always prioritize:
1. Type safety and error handling
2. User experience and accessibility
3. Performance and scalability
4. Security and data privacy
5. Code maintainability and documentation
6. **100% test coverage with comprehensive unit tests**
7. **Automated testing for all new features and bug fixes**
8. **Internationalization and multi-language support**
9. **Feature flag-based development for controlled releases**
10. **Comprehensive API documentation and Postman collections**
11. **Proper authentication and authorization implementation**
12. **Environment-specific deployment and configuration**
13. **Rate limiting and performance optimization**
14. **Error reduction and warning minimization**
15. **Responsive design and modern UI/UX patterns**

For any new features, follow the established patterns and update documentation accordingly.

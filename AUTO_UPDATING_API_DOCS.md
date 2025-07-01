# Auto-Updating API Documentation System

## 🚀 Overview

The Sales Analyzer application features a sophisticated **auto-updating API documentation system** that ensures your API documentation always reflects the latest code changes. This system automatically discovers, parses, and documents all API endpoints in real-time.

## 🏗️ System Architecture

### 1. Dynamic Endpoint Discovery (`/api/endpoints`)
- **Location**: `/src/app/api/endpoints/route.ts`
- **Function**: Recursively scans all API route files and extracts endpoint information
- **Features**:
  - Automatically finds all `route.ts` files in the API directory
  - Parses Swagger/JSDoc comments for detailed documentation
  - Extracts HTTP methods, request/response examples, and authentication requirements
  - Categorizes endpoints automatically based on path patterns
  - Returns JSON with complete endpoint metadata

### 2. Live Swagger/OpenAPI Generation (`/api/swagger.json`)
- **Location**: `/src/app/api/swagger.json/route.ts`
- **Function**: Generates OpenAPI 3.0 specification dynamically from code
- **Features**:
  - Always fresh - no caching, regenerated on each request
  - Includes generation timestamp and source attribution
  - Compatible with Swagger UI and other OpenAPI tools
  - Supports all standard OpenAPI features (schemas, security, examples)

### 3. Integration Hub Interface (`/integrations`)
- **Location**: `/src/app/integrations/page.tsx`
- **Function**: User-friendly interface for API documentation and integration guidance
- **Features**:
  - Real-time endpoint loading from `/api/endpoints`
  - Auto-refresh every 5 minutes
  - Manual refresh capability
  - Loading states and error handling
  - Categorized endpoint display
  - Live status indicators
  - Code examples in multiple languages

## 🔄 How Auto-Updates Work

### 1. Code Change Detection
When you modify any API route file (e.g., add/remove endpoints, update Swagger comments):

1. **Immediate Effect**: Changes are reflected instantly in the live API
2. **Documentation Updates**: Next API documentation request will show changes
3. **UI Refresh**: Integration page auto-refreshes every 5 minutes, or users can manually refresh

### 2. Parsing Process
The system uses several parsing strategies:

```typescript
// 1. File System Scanning
const routeFiles = await findRouteFiles(apiPath);

// 2. Content Analysis
const content = fs.readFileSync(filePath, 'utf-8');
const endpoint = parseRouteFile(content, filePath);

// 3. Swagger Comment Extraction
const swaggerMatch = content.match(/\/\*\*\s*\n\s*\*\s*@swagger\s*\n([\s\S]*?)\*\//);

// 4. HTTP Method Detection
const methods = extractHttpMethods(content);

// 5. Example Generation
const { requestBody, response } = extractExamples(content, swaggerInfo);
```

### 3. Categorization Rules
Endpoints are automatically categorized based on path patterns:

- `/auth/` → Authentication
- `/upload` → File Management  
- `/analyze` → Analysis
- `/chatbot` → AI Chat
- `/analytics` → Analytics
- `/swagger` → Documentation
- Others → Other

## 📝 Adding Documentation to Your APIs

### 1. Basic Swagger Comments
Add JSDoc comments with `@swagger` annotation to your route files:

```typescript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate user and return JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 token:
 *                   type: string
 */
export async function POST(request: NextRequest) {
  // Your implementation
}
```

### 2. Authentication Detection
The system automatically detects protected endpoints by looking for:
- `getAuthenticatedUser()` function calls
- `bearerAuth` security schemes
- `security` properties in Swagger comments

### 3. Smart Example Generation
The system generates request/response examples based on code patterns:
- Login/Register forms for auth endpoints
- File upload examples for upload endpoints
- Analysis parameters for analysis endpoints

## 🔧 Configuration & Customization

### 1. Endpoint Discovery Settings
Modify `/src/app/api/endpoints/route.ts` to:
- Change scanning directories
- Add custom parsing rules
- Modify categorization logic
- Add additional metadata extraction

### 2. Swagger Configuration
Update `/src/lib/swagger.ts` to:
- Change OpenAPI version
- Modify server configurations
- Add global security schemes
- Define reusable schemas

### 3. UI Customization
Edit `/src/app/integrations/page.tsx` to:
- Adjust auto-refresh intervals
- Modify display categories
- Add custom styling
- Include additional code examples

## 🚨 Benefits of Auto-Updating Documentation

### 1. Always Accurate
- Documentation never gets out of sync with code
- No manual maintenance required
- Immediate reflection of code changes

### 2. Developer Friendly
- Automatic discovery of new endpoints
- Consistent documentation format
- Interactive testing capabilities

### 3. Integration Ready
- Multiple export formats (JSON, interactive UI)
- Compatible with popular API tools
- Easy SDK generation

### 4. Real-Time Monitoring
- Live status indicators
- Error handling and fallbacks
- Performance monitoring

## 🛠️ Troubleshooting

### Common Issues

1. **Endpoints Not Appearing**
   - Check if route files are named `route.ts`
   - Verify HTTP method exports (GET, POST, etc.)
   - Check for syntax errors in route files

2. **Documentation Missing**
   - Add Swagger comments to route files
   - Verify comment format (`@swagger` annotation)
   - Check for parsing errors in logs

3. **Auto-Refresh Not Working**
   - Check browser console for fetch errors
   - Verify `/api/endpoints` endpoint is accessible
   - Check network connectivity

### Manual Refresh
Users can always manually refresh documentation using:
- Refresh button in the Integration Hub
- Direct API calls to `/api/endpoints?refresh=true`
- Browser refresh to reload the integration page

## 📊 Monitoring & Analytics

The system provides insights into:
- Number of endpoints discovered
- Last update timestamps
- Error rates and success metrics
- Usage patterns and popular endpoints

## 🔮 Future Enhancements

Potential improvements:
- WebSocket-based real-time updates
- Advanced TypeScript AST parsing
- Automated SDK generation
- Version tracking and changelog generation
- Performance analytics and caching optimization

---

**The auto-updating API documentation system ensures that your API documentation is always current, comprehensive, and developer-friendly, eliminating the common problem of outdated API docs.**

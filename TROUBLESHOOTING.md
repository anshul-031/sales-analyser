# Troubleshooting Guide

## Database Issues

### Issue: "The table `public.uploads` does not exist in the current database"

**Symptoms:**
- Error when trying to upload files or fetch data
- Prisma errors about missing tables
- 500 errors in API endpoints

**Solution:**
```bash
# 1. Generate Prisma client
npx prisma generate

# 2. Push schema to database (creates tables)
npx prisma db push

# 3. Verify database setup
node test-database.js
```

**Why this happens:**
- The database exists but tables haven't been created yet
- Prisma schema needs to be synchronized with the database
- This is a one-time setup step after initial project creation

### Issue: Database Connection Errors

**Symptoms:**
- "Connection refused" errors
- "Invalid DATABASE_URL" errors
- Timeout errors

**Solution:**
1. Check your `.env` file has correct `DATABASE_URL`
2. Ensure your PostgreSQL database is running
3. Verify network connectivity
4. Check database credentials

### Issue: Prisma Client Not Generated

**Symptoms:**
- Import errors for Prisma Client
- "Cannot find module" errors

**Solution:**
```bash
npx prisma generate
```

## File Upload Issues

### Issue: Upload Directory Not Found

**Solution:**
```bash
mkdir uploads
```

The application will also create this directory automatically.

### Issue: File Size Limits

**Default limit:** 50MB per file

**To change:**
Update `MAX_FILE_SIZE` in `.env` file (value in bytes).

## API Key Issues

### Issue: Google Gemini API Errors

**Symptoms:**
- "API key not valid" errors
- "Quota exceeded" errors
- Analysis failures

**Solution:**
1. Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Update `GOOGLE_GEMINI_API_KEY` in `.env` file
3. Ensure API has proper permissions and quota

## Development Setup

### Complete Setup Checklist

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Update all environment variables

3. **Database Setup**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Verify Setup**
   ```bash
   node test-setup.js
   node test-database.js
   ```

5. **Start Development**
   ```bash
   npm run dev
   ```

### Common Commands

```bash
# Reset database (careful - deletes all data)
npx prisma migrate reset

# View database in browser
npx prisma studio

# Check database status
node test-database.js

# Verify complete setup
node test-setup.js

# Fix lint issues
npm run lint -- --fix
```

## Production Deployment

### Environment Variables for Production

Ensure these are set in your production environment:
- `DATABASE_URL` - Production database connection
- `GOOGLE_GEMINI_API_KEY` - Production API key
- `NEXTAUTH_SECRET` - Strong random secret
- `NEXTAUTH_URL` - Your production domain

### Database Migration

For production deployments:
```bash
npx prisma migrate deploy
```

## Deployment Issues

### Issue: ECONNREFUSED localhost:3000 on Vercel

**Symptoms:**
- Error: `connect ECONNREFUSED 127.0.0.1:3000`
- API calls failing after deployment
- Upload works but analysis auto-start fails

**Root Cause:**
Application trying to make internal API calls to localhost instead of the deployed URL.

**Solution - FIXED ✅:**
The application now automatically detects the deployment environment:
- Uses `VERCEL_URL` when deployed on Vercel
- Falls back to `NEXTAUTH_URL` if set
- Uses localhost only in development

**Verification:**
1. Redeploy the application with the latest code
2. Check Vercel logs - should no longer see localhost errors
3. Test file upload and analysis workflow

### Issue: Environment Variables Not Set

**Symptoms:**
- "API key not valid" errors in production
- Missing configuration errors
- 500 errors on API endpoints

**Solution:**
In your deployment platform (Vercel, Railway, etc.), set:
```env
GOOGLE_GEMINI_API_KEY=your_actual_api_key
MAX_FILE_SIZE=52428800
AUTO_DELETE_FILES=true
```

**For Vercel:**
1. Go to your project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable with production values

### Issue: File Upload Errors in Production

**Symptoms:**
- "Permission denied" errors
- "No such file or directory" errors
- Upload endpoint returning 500 errors

**Solution:**
This application uses **memory-based storage** - no file system access required:
- Files are stored in memory during processing
- No upload directories needed in production
- Works on all serverless platforms

**Note:** The current version has been updated to use memory storage instead of file system storage.

### Issue: Build Failures During Deployment

**Symptoms:**
- TypeScript compilation errors
- ESLint errors during build
- Deployment fails at build step

**Solution:**
```bash
# Test locally first
npm run build
npm run lint

# Fix any errors before deployment
npm run lint -- --fix
```

**Common Build Issues:**
- Missing type definitions
- Unused variables or imports
- Syntax errors in TypeScript files

### Issue: API Routes Not Working After Deployment

**Symptoms:**
- 404 errors on API endpoints
- Routes work locally but not in production
- Missing API responses

**Solution:**
1. Verify all API routes are in `/app/api/` directory
2. Ensure proper export statements:
   ```typescript
   export async function GET(request: NextRequest) { }
   export async function POST(request: NextRequest) { }
   ```
3. Check deployment logs for specific errors

### Vercel-Specific Issues

**Function Timeout:**
- Default: 10 seconds for hobby plan
- Upgrade plan or optimize analysis processing

**Memory Limits:**
- Monitor memory usage during analysis
- Large audio files may require plan upgrade

**Environment Variables:**
- Ensure all variables are set in Vercel dashboard
- Variables are case-sensitive

### Other Platforms (Railway, Heroku, etc.)

**File System Access:**
- Use memory storage (current implementation)
- Avoid file system dependencies

**Environment Detection:**
- Set `NEXTAUTH_URL` with your app's URL
- Application will auto-detect proper base URL

**Port Configuration:**
- Next.js handles port automatically
- No manual port configuration needed

### Deployment Checklist

**Pre-deployment:**
- [ ] Build succeeds locally: `npm run build`
- [ ] No lint errors: `npm run lint`
- [ ] Environment variables prepared
- [ ] API key validated

**Post-deployment:**
- [ ] Environment variables set in platform
- [ ] Application loads without errors
- [ ] File upload works
- [ ] Analysis completes successfully
- [ ] No localhost errors in logs

### Common Error Messages

**"fetch failed"**
- Usually network or URL construction issues
- Fixed in latest version with proper URL detection

**"Cannot find module"**
- Missing dependencies in production
- Check package.json and npm install

**"Invalid API key"**
- Environment variable not set correctly
- Verify in deployment platform settings

**"413 Request Entity Too Large"**
- File size exceeds platform limits
- Adjust MAX_FILE_SIZE or platform settings

## Getting Help

1. **Check Logs**: Look at console output for detailed error messages
2. **Verify Environment**: Run `node test-setup.js`
3. **Test Database**: Run `node test-database.js`
4. **API Testing**: Use the Postman collection
5. **Documentation**: Review README.md for complete setup guide

## Error Code Reference

- **P2021**: Database connection issues
- **P2002**: Unique constraint violation
- **P2025**: Record not found
- **Upload errors**: Usually file size or permission issues
- **Analysis errors**: Usually API key or quota issues

## Quick Fixes

**Can't upload files?**
```bash
mkdir uploads
chmod 755 uploads
```

**Database not working?**
```bash
npx prisma db push
node test-database.js
```

**API not responding?**
```bash
npm run dev
# Check http://localhost:3000
```

**Gemini API errors?**
- Check API key in `.env`
- Verify quota in Google Cloud Console
- Test with a small file first
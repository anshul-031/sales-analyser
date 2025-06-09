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
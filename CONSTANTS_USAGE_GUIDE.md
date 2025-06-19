# Centralized Constants Usage Guide

## Overview

The application now uses centralized constants to manage configuration values, eliminating hardcoded values and making maintenance easier.

## File Size Limit Management

### Single Source of Truth

All file size limits are now controlled from `src/lib/constants.ts`:

```typescript
export const FILE_UPLOAD_CONFIG = {
  // Maximum file size in bytes (5MB)
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  // ... other config
} as const;
```

### How to Change the File Size Limit

To change the file size limit in the future, simply update **one line** in `constants.ts`:

```typescript
// To change to 10MB:
MAX_FILE_SIZE: 10 * 1024 * 1024,

// To change to 2MB:
MAX_FILE_SIZE: 2 * 1024 * 1024,
```

This single change will automatically update:
- ✅ Frontend validation (FileUpload component)
- ✅ Backend API validation
- ✅ Utility function defaults
- ✅ Main page component props
- ✅ All error messages and UI displays

### Environment Variable Override

The backend can still be overridden with environment variables:

```bash
# In .env file - this will override the default constant
MAX_FILE_SIZE=10485760  # 10MB in bytes
```

## Other Centralized Configuration

### User Configuration
```typescript
export const USER_CONFIG = {
  DEMO_USER_ID: 'demo-user-001',
} as const;
```

### File Type Configuration
```typescript
export const FILE_UPLOAD_CONFIG = {
  ALLOWED_MIME_TYPES: [
    'audio/mpeg', 'audio/wav', // etc...
  ],
  ALLOWED_EXTENSIONS: ['.mp3', '.wav', // etc...],
} as const;
```

### API Endpoints
```typescript
export const API_CONFIG = {
  ENDPOINTS: {
    UPLOAD: '/api/upload',
    ANALYZE: '/api/analyze',
    // etc...
  },
} as const;
```

## Benefits

1. **Single Source of Truth**: All configuration in one place
2. **Type Safety**: TypeScript ensures consistency
3. **Easy Maintenance**: Change once, applies everywhere
4. **No Hardcoded Values**: Eliminates magic numbers
5. **Environment Flexibility**: Can still override with env vars
6. **Developer Experience**: Clear, documented configuration

## Usage Pattern

```typescript
// Import the constants you need
import { MAX_FILE_SIZE, MAX_FILES } from '@/lib/constants';

// Use them in your components/functions
const MyComponent = () => {
  const maxSize = MAX_FILE_SIZE; // 5MB
  // ... rest of component
};
```

## Future Enhancements

This pattern can be extended for:
- API rate limiting
- Cache durations
- UI theme values
- Feature flags
- Database connection settings
- Third-party service configurations

## Migration Complete

The following files now use centralized constants:
- `src/components/FileUpload.tsx`
- `src/app/api/upload/route.ts`
- `src/app/page.tsx`
- `src/lib/utils.ts`

No more searching for hardcoded values across multiple files!
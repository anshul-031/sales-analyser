# File Upload Limit Update Summary

## Overview
Changed the file upload limit for call recordings from 50MB to 5MB across the entire application using centralized constants to eliminate hardcoded values.

## Changes Made

### 1. **NEW: Centralized Constants** (`src/lib/constants.ts`) - BEST PRACTICE
- **Created centralized configuration file** with `FILE_UPLOAD_CONFIG` object
- **Key Constants**:
  - `MAX_FILE_SIZE: 5 * 1024 * 1024` (5MB)
  - `MAX_FILES: 10`
  - `ALLOWED_MIME_TYPES` and `ALLOWED_EXTENSIONS` arrays
  - `USER_CONFIG.DEMO_USER_ID`
- **Benefits**: Single source of truth, easy maintenance, type safety
- **Impact**: Eliminates hardcoded values throughout the application

### 2. Frontend Component (`src/components/FileUpload.tsx`)
- **Import**: Added `import { MAX_FILE_SIZE, MAX_FILES } from '@/lib/constants'`
- **Default Props**: Updated from hardcoded values to `maxFiles = MAX_FILES, maxFileSize = MAX_FILE_SIZE`
- **Impact**: Frontend uses centralized constants for validation

### 3. Backend API (`src/app/api/upload/route.ts`)
- **Import**: Added `import { FILE_UPLOAD_CONFIG } from '@/lib/constants'`
- **Constants**: Replaced hardcoded arrays with `FILE_UPLOAD_CONFIG.ALLOWED_MIME_TYPES` and `ALLOWED_EXTENSIONS`
- **Environment Override**: `parseInt(process.env.MAX_FILE_SIZE || FILE_UPLOAD_CONFIG.MAX_FILE_SIZE.toString())`
- **Type Safety**: Added proper TypeScript casting for array includes
- **Impact**: Server-side validation uses centralized config with env override capability

### 4. Main Page Component (`src/app/page.tsx`) - CRITICAL FIX
- **Import**: Added `import { MAX_FILE_SIZE, MAX_FILES, USER_CONFIG } from '@/lib/constants'`
- **Props**: Updated FileUpload props to use `maxFiles={MAX_FILES}` and `maxFileSize={MAX_FILE_SIZE}`
- **User ID**: Replaced hardcoded demo user ID with `USER_CONFIG.DEMO_USER_ID`
- **Impact**: Main page now uses centralized constants instead of hardcoded values

### 4. User Experience Improvements (`src/components/FileUpload.tsx`) - NEW
- **Added Error State Management**: Added `errorMessages` state to track validation errors
- **Enhanced Error Handling**: Improved `onDrop` function to capture and display user-friendly error messages
- **User-Friendly Error Display**: Added dedicated error message section with:
  - Clear error descriptions for file size limits
  - File type validation messages
  - Dismissible error notifications
  - Visual indicators with AlertCircle icon
- **Impact**: Users now see clear, actionable error messages instead of silent rejections

### 5. Utility Function (`src/lib/utils.ts`)
- **Import**: Added `import { MAX_FILE_SIZE } from "@/lib/constants"`
- **Function**: Updated `validateFileSize()` default parameter to use `maxSize: number = MAX_FILE_SIZE`
- **Impact**: Utility function uses centralized constant for consistency

### 6. Environment Configuration
- **`.env`**: Updated `MAX_FILE_SIZE` from `52428800` to `5242880`
- **`.env.example`**: Added `MAX_FILE_SIZE=5242880` and updated `MAX_SMALL_FILE_SIZE` to `5242880`
- **Impact**: Environment variables reflect new 5MB limit

### 7. Documentation Updates
- **`README.md`**:
  - Line 112: Updated environment variable example from `52428800` to `5242880`
  - Line 167: Updated file size limit description from "50MB per file" to "5MB per file"
- **`postman/Sales_Analyzer_API.postman_collection.json`**:
  - Line 64: Updated API description from "Max file size: 50MB per file" to "Max file size: 5MB per file"

## Technical Details

### File Size Calculations
- **Previous Limit**: 50MB = 50 × 1024 × 1024 = 52,428,800 bytes
- **New Limit**: 5MB = 5 × 1024 × 1024 = 5,242,880 bytes

### Validation Points
1. **Frontend**: React dropzone component validates file size before upload
2. **Backend**: Express API validates file size during upload processing
3. **Utility**: Helper function provides consistent validation logic

## Testing & Verification

### Build Status ✅
- **Compilation**: Successful with no errors
- **Linting**: No ESLint warnings or errors
- **Type Checking**: All TypeScript types valid
- **Static Generation**: 9/9 pages generated successfully

### Error Messages
Users will see appropriate error messages when attempting to upload files larger than 5MB:
- Frontend: File size validation in upload component
- Backend: "File too large. Maximum size: 5MB" error response

## Impact Assessment

### Positive Effects
- ✅ Reduced memory usage for file processing
- ✅ Faster upload times for users
- ✅ Better server resource management
- ✅ Consistent limit enforcement across all endpoints
- ✅ Clear user feedback for rejected files
- ✅ Improved user experience with actionable error messages
- ✅ **Centralized configuration management**
- ✅ **Single source of truth for file size limits**
- ✅ **Easy maintenance and updates**
- ✅ **Type safety and consistency**
- ✅ **Eliminated hardcoded values**

### Considerations
- ⚠️ Existing users with larger files will need to compress or split recordings
- ✅ User education provided through clear error messages (no longer a concern)

## Files Modified
1. **NEW**: `src/lib/constants.ts` - **CENTRALIZED CONFIGURATION**
2. `src/components/FileUpload.tsx` - **ENHANCED WITH USER FEEDBACK + CONSTANTS**
3. `src/app/api/upload/route.ts` - **USES CENTRALIZED CONSTANTS**
4. `src/app/page.tsx` - **CRITICAL FIX + CONSTANTS**
5. `src/lib/utils.ts` - **USES CENTRALIZED CONSTANTS**
6. `.env`
7. `.env.example`
8. `README.md`
9. `postman/Sales_Analyzer_API.postman_collection.json`

## Deployment Notes
- No database migrations required (file-based storage system)
- Environment variables updated for immediate effect
- Changes take effect immediately after deployment
- Compatible with existing uploaded files (only affects new uploads)

## Date
January 19, 2025
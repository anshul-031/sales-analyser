# Company Logo Implementation Guide

## Overview
The company logo has been implemented throughout the application using `company_logo.svg`. The logo appears in multiple locations with consistent sizing and styling.

## Logo Locations

### 1. Navigation Header (`src/components/Navigation.tsx`)
- **Location**: Top navigation bar
- **Size**: Medium (48x48px)
- **Shows Text**: Separate text element
- **Usage**: `<Logo size="md" />`

### 2. Landing Page Footer (`src/components/LandingPage.tsx`)
- **Location**: Footer section
- **Size**: Medium (48x48px)
- **Shows Text**: Separate text element
- **Usage**: `<Logo size="md" />`

### 3. Login Form (`src/components/LoginForm.tsx`)
- **Location**: Top of login form
- **Size**: Extra Large (96x96px)
- **Shows Text**: No
- **Usage**: `<Logo size="xl" />`

### 4. Register Form (`src/components/RegisterForm.tsx`)
- **Location**: Top of registration form
- **Size**: Extra Large (96x96px)
- **Shows Text**: No
- **Usage**: `<Logo size="xl" />`

## Logo Component (`src/components/Logo.tsx`)

### Current Implementation
The logo component now uses the actual company logo:
- JPG file: `public/company_logo.jpg`
- Larger responsive sizing with object-contain
- Accessible alt text
- Simplified design focused on the logo only

### Props
- `size`: 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
- `className`: Additional CSS classes

### Updating the Logo

To update the logo in the future:

1. **Replace the logo file**:
   Replace `public/company_logo.jpg` with your new logo file (keep the same filename)

2. **Or use a different filename**:
   If using a different filename, update the `src` path in the Logo component:
   
   ```tsx
   <img 
     src="/your-new-logo.jpg" 
     alt="AI Call Analyser Logo" 
     className={`${sizeClasses[size]} object-contain`}
   />
   ```

3. **Update the company name** (if needed):
   Change "AI Call Analyser" to your actual company name in the Logo component.

## Size Classes
- `sm`: 40x40px (h-10 w-10)
- `md`: 48x48px (h-12 w-12) 
- `lg`: 80x80px (h-20 w-20)
- `xl`: 96x96px (h-24 w-24)

## Best Practices
1. Use SVG format for crisp rendering at all sizes
2. Ensure logo works on both light and dark backgrounds
3. Maintain consistent aspect ratio
4. Test logo visibility across all components
5. Consider accessibility (alt text, contrast)

## Adding Logo to New Components
To add the logo to new components:

1. Import the Logo component:
   ```tsx
   import Logo from './Logo';
   ```

2. Use the component:
   ```tsx
   <Logo size="md" />
   ```

3. Add text separately if needed:
   ```tsx
   <div className="flex items-center">
     <Logo size="md" />
     <span className="ml-3 font-bold">Your Company Name</span>
   </div>
   ```

## Future Enhancements
- Dark mode logo variant
- Animated logo for loading states
- Different logo variations for different contexts
- Logo with custom colors/themes

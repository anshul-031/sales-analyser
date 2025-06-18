# Vercel Analytics Integration

This document explains the Vercel Analytics integration implemented in the Sales Analyser application.

## Overview

Vercel Analytics has been integrated to provide comprehensive web analytics and performance monitoring for the Sales Analyser application. This includes:

- **Web Analytics**: Track page views, user interactions, and user behavior
- **Speed Insights**: Monitor Core Web Vitals and performance metrics

## Components Added

### 1. Analytics Component (`@vercel/analytics/react`)
- Tracks page views automatically
- Monitors user interactions
- Provides insights into user behavior patterns
- Privacy-friendly analytics without cookies

### 2. Speed Insights Component (`@vercel/speed-insights/next`)
- Monitors Core Web Vitals (CLS, FID, LCP)
- Tracks performance metrics
- Provides insights for performance optimization

## Implementation Details

### Dependencies Added
```json
{
  "@vercel/analytics": "^1.x.x",
  "@vercel/speed-insights": "^1.x.x"
}
```

### Layout Integration
The components are integrated in the root layout (`src/app/layout.tsx`):

```tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

## Configuration

### Automatic Setup
- Analytics automatically starts collecting data when deployed to Vercel
- No additional configuration required for basic functionality
- Data collection is GDPR compliant and privacy-friendly

### Custom Events (Optional)
You can track custom events by importing the `track` function:

```tsx
import { track } from '@vercel/analytics';

// Track custom events
track('file_uploaded', { fileType: 'audio', fileSize: '2MB' });
track('analysis_completed', { duration: '30s', success: true });
```

## Dashboard Access

### Vercel Analytics Dashboard
1. Access your Vercel project dashboard
2. Navigate to the "Analytics" tab
3. View real-time and historical analytics data

### Speed Insights Dashboard
1. Access your Vercel project dashboard
2. Navigate to the "Speed Insights" tab
3. Monitor Core Web Vitals and performance metrics

## Key Metrics Tracked

### Analytics Metrics
- **Page Views**: Total and unique page views
- **Visitors**: Unique visitors and returning visitors
- **Referrers**: Traffic sources and referral patterns
- **Countries**: Geographic distribution of users
- **Devices**: Browser and device information

### Performance Metrics
- **First Contentful Paint (FCP)**: Time to first content render
- **Largest Contentful Paint (LCP)**: Time to largest content render
- **First Input Delay (FID)**: Time to first user interaction
- **Cumulative Layout Shift (CLS)**: Visual stability metric

## Privacy Considerations

- **No Cookies**: Vercel Analytics doesn't use cookies
- **No Personal Data**: No personally identifiable information is collected
- **GDPR Compliant**: Automatically compliant with privacy regulations
- **Opt-out Friendly**: Users can opt-out through browser settings

## Benefits for Sales Analyser

### User Behavior Insights
- Understand how users interact with the file upload feature
- Track analysis completion rates
- Monitor chatbot usage patterns

### Performance Optimization
- Identify slow-loading components
- Monitor file upload performance
- Track API response times

### Business Intelligence
- Geographic usage patterns
- Peak usage times
- Feature adoption rates

## Best Practices

### Custom Event Tracking
Consider adding custom events for:
- File upload completions
- Analysis requests
- Chatbot interactions
- Feature usage

### Performance Monitoring
- Monitor file upload performance
- Track analysis processing times
- Monitor API endpoint performance

## Troubleshooting

### Analytics Not Showing Data
1. Ensure the app is deployed to Vercel
2. Check that the Analytics component is properly imported
3. Verify the Vercel project has analytics enabled

### Performance Issues
1. Check the Speed Insights dashboard for bottlenecks
2. Monitor Core Web Vitals scores
3. Optimize based on performance recommendations

## Future Enhancements

### Custom Dashboard
- Create custom analytics views
- Implement business-specific metrics
- Add real-time monitoring alerts

### A/B Testing Integration
- Use analytics data for feature testing
- Monitor conversion rates
- Track user engagement improvements

## Logs and Debugging

Analytics components include built-in logging for debugging:
- Console logs in development mode
- Error tracking for failed events
- Performance monitoring logs

## Deployment

The analytics components are automatically active when deployed to Vercel. No additional deployment steps are required.

## Conclusion

Vercel Analytics provides comprehensive insights into user behavior and application performance without compromising user privacy. The integration is lightweight, automatic, and provides valuable data for optimizing the Sales Analyser application.
# Tone and Sentiment Analysis Feature

## Overview
Enhanced the Sales Analyzer with comprehensive tone and sentiment analysis capabilities for audio transcriptions. This feature provides deeper insights into the emotional and communicative aspects of sales calls.

## Features Added

### 1. Enhanced Audio Transcription
- **Tone Analysis**: Identifies the tone of each speaker segment (professional, friendly, aggressive, uncertain, confident, frustrated, enthusiastic, calm, etc.)
- **Sentiment Analysis**: Determines sentiment for each segment (positive, negative, neutral, mixed)
- **Confidence Scoring**: Provides confidence levels (low, medium, high) for the analysis accuracy

### 2. Conversation Summary
- **Overall Sentiment**: Aggregate sentiment for the entire conversation
- **Dominant Tones**: Most prominent tones throughout the call
- **Speaker Profiles**: Individual analysis for each speaker including:
  - Dominant sentiment and tone
  - Engagement level
  - Communication style description

### 3. Enhanced UI Display

#### Visual Indicators
- **Color-coded badges** for sentiments and tones
- **Confidence indicators** with gauge icons
- **Speaker profile cards** with comprehensive analysis

#### Sentiment Color Coding
- 🟢 **Positive**: Green background and text
- 🔴 **Negative**: Red background and text  
- ⚪ **Neutral**: Gray background and text
- 🟡 **Mixed**: Yellow background and text

#### Tone Color Coding
- 🔵 **Professional/Confident**: Blue theme
- 🟢 **Friendly/Enthusiastic**: Green theme
- 🔴 **Aggressive/Frustrated**: Red theme
- 🟠 **Uncertain**: Orange theme
- ⚪ **Calm/Neutral**: Gray theme
- 🟣 **Other tones**: Purple theme

### 4. New Analysis Parameter
Added **"Emotional Intelligence & Tone Analysis"** to default analysis parameters:
- Evaluates emotional awareness and empathy
- Assesses tone consistency and appropriateness
- Analyzes ability to read and respond to customer emotions
- Measures professional composure under pressure

## Technical Implementation

### Backend Changes (gemini.ts)
1. **Enhanced transcription prompt** with tone and sentiment requirements
2. **Updated JSON structure** to include tone, sentiment, and confidence data
3. **Conversation summary generation** with speaker profiles
4. **New analysis parameter** for emotional intelligence

### Frontend Changes (AnalysisResults.tsx)
1. **Updated TypeScript interfaces** for new data structure
2. **New styling functions** for tone and sentiment display
3. **Enhanced transcription rendering** with visual indicators
4. **Speaker profile display** with detailed emotional analysis
5. **Conversation summary section** with overall insights

## Data Structure

### Enhanced Transcription Segment
```typescript
interface TranscriptionSegment {
  speaker: string;
  text: string;
  start_time?: number;
  end_time?: number;
  tone?: string;              // NEW
  sentiment?: string;         // NEW
  confidence_level?: string;  // NEW
}
```

### Conversation Summary
```typescript
interface ConversationSummary {
  overall_sentiment: string;
  dominant_tones: string[];
  speaker_profiles: {
    [speaker: string]: {
      dominant_sentiment: string;
      dominant_tone: string;
      engagement_level: string;
      communication_style: string;
    }
  };
}
```

## Benefits

### For Sales Managers
- **Performance Insights**: Understand emotional intelligence of sales reps
- **Training Opportunities**: Identify areas for improvement in tone and sentiment management
- **Customer Satisfaction**: Monitor how customers respond emotionally to sales approaches

### For Sales Representatives
- **Self-Assessment**: Review their own emotional intelligence and tone management
- **Improvement Areas**: Specific feedback on communication style
- **Customer Engagement**: Better understanding of customer emotions during calls

### For Organizations
- **Quality Assurance**: Ensure consistent professional communication
- **Training Programs**: Data-driven training based on emotional intelligence metrics
- **Customer Experience**: Improve overall customer satisfaction through better emotional awareness

## Usage
1. Upload an audio file for transcription
2. The system automatically analyzes tone and sentiment for each speaker segment
3. View the enhanced transcription with color-coded emotional indicators
4. Review the conversation summary for overall insights
5. Check individual speaker profiles for detailed emotional analysis
6. Use the "Emotional Intelligence" analysis parameter for comprehensive evaluation

## Future Enhancements
- Real-time emotion detection during live calls
- Emotional trend analysis over time
- Personalized coaching recommendations based on emotional patterns
- Integration with CRM systems for customer emotion tracking

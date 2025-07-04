import React, { useState } from 'react';
import { 
  User, 
  MessageSquare, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Star,
  Clock,
  Target,
  Heart,
  ThumbsUp,
  ThumbsDown,
  Activity,
  Award,
  Zap,
  Shield,
  Sparkles,
  Phone,
  Mic,
  Volume2,
  Brain,
  Lightbulb,
  FileText,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Info
} from 'lucide-react';
import type { AnalysisDisplayProps, AnalysisResultData, ColorScheme } from '@/types';

const getIconForKey = (key: string) => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('sentiment') || lowerKey.includes('emotion')) return <Heart className="w-5 h-5" />;
  if (lowerKey.includes('score') || lowerKey.includes('rating')) return <Star className="w-5 h-5" />;
  if (lowerKey.includes('duration') || lowerKey.includes('time')) return <Clock className="w-5 h-5" />;
  if (lowerKey.includes('objective') || lowerKey.includes('goal')) return <Target className="w-5 h-5" />;
  if (lowerKey.includes('positive')) return <ThumbsUp className="w-5 h-5" />;
  if (lowerKey.includes('negative')) return <ThumbsDown className="w-5 h-5" />;
  if (lowerKey.includes('customer') || lowerKey.includes('client')) return <User className="w-5 h-5" />;
  if (lowerKey.includes('conversation') || lowerKey.includes('dialogue')) return <MessageSquare className="w-5 h-5" />;
  if (lowerKey.includes('call') || lowerKey.includes('phone')) return <Phone className="w-5 h-5" />;
  if (lowerKey.includes('audio') || lowerKey.includes('voice')) return <Volume2 className="w-5 h-5" />;
  if (lowerKey.includes('quality') || lowerKey.includes('performance')) return <Award className="w-5 h-5" />;
  if (lowerKey.includes('engagement') || lowerKey.includes('interaction')) return <Activity className="w-5 h-5" />;
  if (lowerKey.includes('analysis') || lowerKey.includes('insight')) return <Brain className="w-5 h-5" />;
  if (lowerKey.includes('recommendation') || lowerKey.includes('suggestion')) return <Lightbulb className="w-5 h-5" />;
  if (lowerKey.includes('confidence') || lowerKey.includes('certainty')) return <Shield className="w-5 h-5" />;
  if (lowerKey.includes('highlight') || lowerKey.includes('key')) return <Sparkles className="w-5 h-5" />;
  if (lowerKey.includes('energy') || lowerKey.includes('intensity')) return <Zap className="w-5 h-5" />;
  return <TrendingUp className="w-5 h-5" />;
};

const getCardColorScheme = (key: string): ColorScheme => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('sentiment') || lowerKey.includes('emotion')) 
    return { bg: 'bg-gradient-to-br from-pink-50 to-rose-50', border: 'border-pink-200', icon: 'text-pink-600' };
  if (lowerKey.includes('score') || lowerKey.includes('rating')) 
    return { bg: 'bg-gradient-to-br from-yellow-50 to-amber-50', border: 'border-yellow-200', icon: 'text-yellow-600' };
  if (lowerKey.includes('positive')) 
    return { bg: 'bg-gradient-to-br from-green-50 to-emerald-50', border: 'border-green-200', icon: 'text-green-600' };
  if (lowerKey.includes('negative')) 
    return { bg: 'bg-gradient-to-br from-red-50 to-rose-50', border: 'border-red-200', icon: 'text-red-600' };
  if (lowerKey.includes('quality') || lowerKey.includes('performance')) 
    return { bg: 'bg-gradient-to-br from-purple-50 to-violet-50', border: 'border-purple-200', icon: 'text-purple-600' };
  if (lowerKey.includes('engagement') || lowerKey.includes('interaction')) 
    return { bg: 'bg-gradient-to-br from-orange-50 to-amber-50', border: 'border-orange-200', icon: 'text-orange-600' };
  if (lowerKey.includes('confidence') || lowerKey.includes('certainty')) 
    return { bg: 'bg-gradient-to-br from-teal-50 to-cyan-50', border: 'border-teal-200', icon: 'text-teal-600' };
  if (lowerKey.includes('highlight') || lowerKey.includes('key')) 
    return { bg: 'bg-gradient-to-br from-indigo-50 to-blue-50', border: 'border-indigo-200', icon: 'text-indigo-600' };
  
  return { bg: 'bg-gradient-to-br from-slate-50 to-gray-50', border: 'border-slate-200', icon: 'text-slate-600' };
};

const getProgressBar = (value: any, key: string) => {
  const lowerKey = key.toLowerCase();
  let numericValue = null;
  let maxValue = 100;
  
  if (typeof value === 'number') {
    numericValue = value;
    // Assume score/rating parameters are out of 10 or 100
    if (lowerKey.includes('score') || lowerKey.includes('rating')) {
      maxValue = value <= 10 ? 10 : 100;
    }
    // Assume percentage values
    if (lowerKey.includes('percent') || lowerKey.includes('%')) {
      maxValue = 100;
    }
  } else if (typeof value === 'string') {
    // Try to extract numeric values from strings like "8/10", "75%", "3.5 out of 5"
    const numMatch = value.match(/(\d+\.?\d*)/);
    if (numMatch) {
      numericValue = parseFloat(numMatch[1]);
      if (value.includes('/10') || value.includes('out of 10')) maxValue = 10;
      if (value.includes('/5') || value.includes('out of 5')) maxValue = 5;
      if (value.includes('%')) maxValue = 100;
    }
  }
  
  if (numericValue !== null && !isNaN(numericValue)) {
    const percentage = Math.min((numericValue / maxValue) * 100, 100);
    const colorClass = percentage >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' : 
                      percentage >= 60 ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 
                      percentage >= 40 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : 
                      'bg-gradient-to-r from-red-400 to-red-600';
    
    return (
      <div className="mt-3 p-3 bg-white/50 rounded-lg backdrop-blur-sm">
        <div className="flex justify-between text-xs text-gray-600 mb-2 font-medium">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-current opacity-60" />
            Value: {numericValue}{maxValue === 100 && !key.includes('%') ? '' : `/${maxValue}`}
          </span>
          <span className="font-bold">{Math.round(percentage)}%</span>
        </div>
        <div className="relative w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
          <div 
            className={`h-3 rounded-full transition-all duration-1000 ease-out shadow-sm ${colorClass}`}
            style={{ 
              width: `${percentage}%`,
              backgroundSize: '20px 20px',
              backgroundImage: 'linear-gradient(45deg, rgba(255,255,255,0.1) 25%, transparent 25%, transparent 75%, rgba(255,255,255,0.1) 75%)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-full animate-pulse" />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>{maxValue}</span>
        </div>
      </div>
    );
  }
  
  return null;
};

const getBadgeForValue = (value: any, key: string) => {
  const lowerKey = key.toLowerCase();
  
  if (typeof value === 'boolean') {
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
        value 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {value ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
        {value ? 'Yes' : 'No'}
      </span>
    );
  }
  
  if (typeof value === 'string') {
    if (lowerKey.includes('sentiment')) {
      const sentiment = value.toLowerCase();
      if (sentiment.includes('positive')) {
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <ThumbsUp className="w-3 h-3" /> Positive
        </span>;
      }
      if (sentiment.includes('negative')) {
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <ThumbsDown className="w-3 h-3" /> Negative
        </span>;
      }
      if (sentiment.includes('neutral')) {
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
          <Activity className="w-3 h-3" /> Neutral
        </span>;
      }
    }
    
    if (lowerKey.includes('priority') || lowerKey.includes('importance')) {
      const priority = value.toLowerCase();
      if (priority.includes('high')) {
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
          <AlertCircle className="w-3 h-3" /> High Priority
        </span>;
      }
      if (priority.includes('medium')) {
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          <Clock className="w-3 h-3" /> Medium Priority
        </span>;
      }
      if (priority.includes('low')) {
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <CheckCircle className="w-3 h-3" /> Low Priority
        </span>;
      }
    }
  }
  
  if (typeof value === 'number') {
    if (lowerKey.includes('score') || lowerKey.includes('rating')) {
      const maxScore = value <= 10 ? 10 : 100;
      const percentage = (value / maxScore) * 100;
      
      if (percentage >= 80) {
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
          <Star className="w-3 h-3" /> Excellent
        </span>;
      }
      if (percentage >= 60) {
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
          <ThumbsUp className="w-3 h-3" /> Good
        </span>;
      }
      if (percentage >= 40) {
        return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-200">
          <Clock className="w-3 h-3" /> Average
        </span>;
      }
      return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
        <XCircle className="w-3 h-3" /> Needs Improvement
      </span>;
    }
  }
  
  return null;
};

const formatKey = (key: string) => {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
};

const renderValue = (value: any, level = 0, parentKey = ''): React.ReactElement => {
  console.log(`[AnalysisDisplay] Rendering value:`, { value, type: typeof value, level, parentKey });

  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-2 text-gray-400 italic bg-gray-50 px-3 py-2 rounded-lg">
        <AlertCircle className="w-4 h-4" />
        <span>Not available</span>
      </div>
    );
  }

  if (typeof value === 'string') {
    const badge = getBadgeForValue(value, parentKey);
    
    if (value.length > 200) {
      return (
        <div className="space-y-3">
          {badge && <div>{badge}</div>}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-600">Detailed Content</span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{value}</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-800 font-medium">{value}</span>
          {badge}
        </div>
        {getProgressBar(value, parentKey)}
      </div>
    );
  }

  if (typeof value === 'number') {
    const badge = getBadgeForValue(value, parentKey);
    const progressBar = getProgressBar(value, parentKey);
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-blue-600 font-bold text-lg">{value}</span>
          {badge}
        </div>
        {progressBar}
      </div>
    );
  }

  if (typeof value === 'boolean') {
    const badge = getBadgeForValue(value, parentKey);
    return (
      <div className="flex items-center justify-between">
        {badge}
        <div className={`w-3 h-3 rounded-full ${value ? 'bg-green-400' : 'bg-red-400'}`} />
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div className="flex items-center gap-2 text-gray-400 italic bg-gray-50 px-3 py-2 rounded-lg">
          <AlertCircle className="w-4 h-4" />
          <span>No items</span>
        </div>
      );
    }
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
            {value.length} items
          </div>
        </div>
        {value.map((item, index) => (
          <div key={index} className="relative group">
            <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-white to-gray-50 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
              <div className="flex-shrink-0">
                <span className="flex items-center justify-center w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-bold rounded-full shadow-sm group-hover:scale-110 transition-transform">
                  {index + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {renderValue(item, level + 1, parentKey)}
              </div>
            </div>
            {index < value.length - 1 && (
              <div className="flex justify-center my-2">
                <div className="w-px h-3 bg-gray-300" />
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object' && value !== null) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4">
          {Object.entries(value).map(([nestedKey, nestedValue], index) => {
            const colorScheme = getCardColorScheme(nestedKey);
            return (
              <div 
                key={nestedKey} 
                className={`${colorScheme.bg} p-4 rounded-xl border ${colorScheme.border} shadow-sm hover:shadow-md transition-all duration-200`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-white shadow-sm ${colorScheme.icon}`}>
                    {getIconForKey(nestedKey)}
                  </div>
                  <div className="flex-1">
                    <h5 className="font-semibold text-gray-800 text-sm">{formatKey(nestedKey)}</h5>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-current opacity-50" />
                      <span className="text-xs text-gray-600">Parameter {index + 1}</span>
                    </div>
                  </div>
                </div>
                <div className="ml-2 pl-4 border-l-2 border-white/50">
                  {renderValue(nestedValue, level + 1, nestedKey)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-gray-500 bg-gray-100 px-3 py-2 rounded-lg">
      <AlertCircle className="w-4 h-4" />
      <span>Unknown data type</span>
    </div>
  );
};

// Core analysis parameters that should be displayed
const CORE_ANALYSIS_PARAMETERS = [
  'communication_skills',
  'product_knowledge', 
  'customer_needs_analysis',
  'closing_techniques',
  'overall_performance',
  'emotional_intelligence'
];

// Keys to exclude from display (transcription and other non-parameter data)
const EXCLUDED_KEYS = [
  'transcription',
  'diarized_transcription', 
  'original_language',
  'english_translation',
  'conversation_summary',
  'speaker_profiles',
  'speaker_mapping',
  'customer_name',
  'metadata',
  'type',
  'analysisDate',
  'overallScore',
  'timestamp',
  'createdAt',
  'updatedAt'
];

const isAnalysisParameter = (key: string, value: any): boolean => {
  // Check if it's a core analysis parameter
  if (CORE_ANALYSIS_PARAMETERS.includes(key)) {
    return true;
  }
  
  // Check if it's excluded
  if (EXCLUDED_KEYS.includes(key)) {
    return false;
  }
  
  // Check if the value has analysis parameter structure (score, summary, etc.)
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const hasAnalysisStructure = 'score' in value || 
                                'summary' in value || 
                                ('strengths' in value && 'improvements' in value);
    return hasAnalysisStructure;
  }
  
  return false;
};

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ analysisResult, isNested = false }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');
  
  console.log('[AnalysisDisplay] Received analysisResult:', analysisResult);
  
  if (!analysisResult) {
    console.log('[AnalysisDisplay] No analysis result provided');
    return (
      <div className="p-12 text-center bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl">
        <div className="bg-white p-6 rounded-xl shadow-sm inline-block">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Analysis Available</h3>
          <p className="text-gray-500">No analysis data has been generated for this recording yet.</p>
        </div>
      </div>
    );
  }

  if (typeof analysisResult !== 'object') {
    console.log('[AnalysisDisplay] Analysis result is not an object:', typeof analysisResult);
    return (
      <div className="p-12 text-center bg-gradient-to-br from-orange-50 to-red-50 rounded-2xl">
        <div className="bg-white p-6 rounded-xl shadow-sm inline-block">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-400" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Invalid Data Format</h3>
          <p className="text-gray-500">Expected analysis object, but received {typeof analysisResult}</p>
        </div>
      </div>
    );
  }

  // Filter entries to show only analysis parameters
  let entries = Object.entries(analysisResult);
  
  // If this is a structured analysis result with a 'parameters' field, use that
  if (analysisResult.parameters && typeof analysisResult.parameters === 'object') {
    entries = Object.entries(analysisResult.parameters);
  } else {
    // Filter the entries to show only analysis parameters
    entries = entries.filter(([key, value]) => isAnalysisParameter(key, value));
  }
  
  console.log('[AnalysisDisplay] Filtered analysis parameters:', entries.length);

  if (entries.length === 0) {
    return (
      <div className="p-12 text-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl">
        <div className="bg-white p-6 rounded-xl shadow-sm inline-block">
          <Brain className="w-16 h-16 mx-auto mb-4 text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Performance Parameters</h3>
          <p className="text-gray-500">No analysis parameters were found for this recording.</p>
        </div>
      </div>
    );
  }

  const toggleSection = (key: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedSections(newExpanded);
  };

  const expandAll = () => {
    setExpandedSections(new Set(entries.map(([key]) => key)));
  };

  const collapseAll = () => {
    setExpandedSections(new Set());
  };

  // Extract summary information from parameters
  const getSummaryFromParameter = (value: any) => {
    if (typeof value === 'object' && value !== null) {
      if ('score' in value) return `Score: ${value.score}/10`;
      if ('summary' in value) return value.summary;
      if ('rating' in value) return `Rating: ${value.rating}`;
      if (Array.isArray(value)) return `${value.length} items`;
      return `${Object.keys(value).length} details`;
    }
    if (typeof value === 'string' && value.length > 100) {
      return value.substring(0, 100) + '...';
    }
    return value;
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-slate-50 p-6 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl text-white shadow-md">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Performance Analysis</h2>
            <p className="text-sm text-gray-600">{entries.length} performance parameters evaluated</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              {viewMode === 'compact' ? <BarChart3 className="w-4 h-4" /> : <Info className="w-4 h-4" />}
              {viewMode === 'compact' ? 'Detailed View' : 'Compact View'}
            </button>
          </div>

          {/* Expand/Collapse Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Collapse All
            </button>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            <span>Complete</span>
          </div>
        </div>
      </div>

      {/* Analysis Parameters */}
      <div className="space-y-3">
        {entries.map(([key, value], index) => {
          console.log(`[AnalysisDisplay] Processing key: ${key}, value:`, value);
          const colorScheme = getCardColorScheme(key);
          const isExpanded = expandedSections.has(key);
          const summary = getSummaryFromParameter(value);
          
          return (
            <div 
              key={key} 
              className={`${colorScheme.bg} border ${colorScheme.border} rounded-xl shadow-sm hover:shadow-md transition-all duration-200`}
            >
              {/* Parameter Header - Always Visible */}
              <button
                onClick={() => toggleSection(key)}
                className="w-full p-4 flex items-center justify-between hover:bg-white/20 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-white shadow-sm ${colorScheme.icon}`}>
                    {getIconForKey(key)}
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-800">{formatKey(key)}</h4>
                    {viewMode === 'compact' && (
                      <p className="text-sm text-gray-600 mt-1">{summary}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 bg-white/50 px-2 py-1 rounded-full">
                    #{index + 1}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-600" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-600" />
                  )}
                </div>
              </button>

              {/* Parameter Details - Collapsible */}
              {isExpanded && (
                <div className="px-4 pb-4 border-t border-white/30">
                  <div className="pt-4 pl-2 border-l-2 border-white/40">
                    {renderValue(value, 0, key)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center">
        <div className="inline-flex items-center gap-2 text-sm text-gray-500">
          <Sparkles className="w-4 h-4" />
          <span>Performance metrics powered by AI • Focused on key sales competencies</span>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDisplay;

import React from 'react';
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
  ThumbsDown
} from 'lucide-react';

interface AnalysisDisplayProps {
  analysisResult: any;
}

const getIconForKey = (key: string) => {
  const lowerKey = key.toLowerCase();
  if (lowerKey.includes('sentiment') || lowerKey.includes('emotion')) return <Heart className="w-4 h-4" />;
  if (lowerKey.includes('score') || lowerKey.includes('rating')) return <Star className="w-4 h-4" />;
  if (lowerKey.includes('duration') || lowerKey.includes('time')) return <Clock className="w-4 h-4" />;
  if (lowerKey.includes('objective') || lowerKey.includes('goal')) return <Target className="w-4 h-4" />;
  if (lowerKey.includes('positive')) return <ThumbsUp className="w-4 h-4" />;
  if (lowerKey.includes('negative')) return <ThumbsDown className="w-4 h-4" />;
  if (lowerKey.includes('customer') || lowerKey.includes('client')) return <User className="w-4 h-4" />;
  if (lowerKey.includes('conversation') || lowerKey.includes('dialogue')) return <MessageSquare className="w-4 h-4" />;
  return <TrendingUp className="w-4 h-4" />;
};

const formatKey = (key: string) => {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
};

const renderValue = (value: any, level = 0): React.ReactElement => {
  console.log(`[AnalysisDisplay] Rendering value:`, { value, type: typeof value, level });

  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">Not available</span>;
  }

  if (typeof value === 'string') {
    if (value.length > 200) {
      return (
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-gray-700 whitespace-pre-wrap">{value}</p>
        </div>
      );
    }
    return <span className="text-gray-800">{value}</span>;
  }

  if (typeof value === 'number') {
    return <span className="text-blue-600 font-medium">{value}</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span className={`inline-flex items-center gap-1 ${value ? 'text-green-600' : 'text-red-600'}`}>
        {value ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 italic">No items</span>;
    }
    
    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-md">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
              {index + 1}
            </span>
            <div className="flex-1">{renderValue(item, level + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object' && value !== null) {
    return (
      <div className="space-y-3 pl-4 border-l-2 border-gray-200">
        {Object.entries(value).map(([nestedKey, nestedValue]) => (
          <div key={nestedKey} className="bg-gray-50 p-3 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              {getIconForKey(nestedKey)}
              <h5 className="font-medium text-gray-700">{formatKey(nestedKey)}</h5>
            </div>
            <div className="ml-6">{renderValue(nestedValue, level + 1)}</div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-gray-500">Unknown data type</span>;
};

const AnalysisDisplay: React.FC<AnalysisDisplayProps & { isNested?: boolean }> = ({ analysisResult, isNested = false }) => {
  console.log('[AnalysisDisplay] Received analysisResult:', analysisResult);
  
  if (!analysisResult) {
    console.log('[AnalysisDisplay] No analysis result provided');
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">No analysis data available</p>
      </div>
    );
  }

  if (typeof analysisResult !== 'object') {
    console.log('[AnalysisDisplay] Analysis result is not an object:', typeof analysisResult);
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-orange-300" />
        <p className="text-gray-500">Invalid analysis data format</p>
        <p className="text-xs text-gray-400 mt-2">Expected object, got {typeof analysisResult}</p>
      </div>
    );
  }

  const entries = Object.entries(analysisResult);
  console.log('[AnalysisDisplay] Analysis entries:', entries.length);

  if (entries.length === 0) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500">No analysis parameters found</p>
      </div>
    );
  }

  const containerClasses = isNested ? 'space-y-3' : 'space-y-4';

  return (
    <div className={containerClasses}>
      {entries.map(([key, value]) => {
        console.log(`[AnalysisDisplay] Processing key: ${key}, value:`, value);
        return (
          <div key={key} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
              {getIconForKey(key)}
              <h4 className="font-semibold text-lg text-gray-700">{formatKey(key)}</h4>
            </div>
            <div className="ml-6">{renderValue(value)}</div>
          </div>
        );
      })}
    </div>
  );
};

export default AnalysisDisplay;

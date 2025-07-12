'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  MessageSquare,
  Mic,
  Activity,
  PieChart,
  Calendar,
  Download,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  XCircle,
  Target
} from 'lucide-react';
import { Logger } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

interface AnalyticsData {
  totalRecordings: number;
  totalAnalyses: number;
  averageCallDuration: number;
  transcriptionRate: number;
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
  }>;
  callsByTimeframe: Array<{
    period: string;
    count: number;
  }>;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  actionItems?: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    overdue: number;
    highPriority: number;
    completionRate: number;
    timeframe: string;
  };
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('7d');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && !authLoading) {
      loadAnalytics();
    }
  }, [timeframe, user, authLoading]);

  const loadAnalytics = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Fetch uploads and analyses data
      const [uploadsResponse, analysesResponse] = await Promise.all([
        fetch('/api/uploads-optimized'),
        fetch(`/api/analytics-optimized?timeframe=${timeframe}`)
      ]);

      const [uploadsResult, analyticsResult] = await Promise.all([
        uploadsResponse.json(),
        analysesResponse.json()
      ]);

      if (uploadsResult.success && analyticsResult.success) {
        const uploads = uploadsResult.uploads || [];
        const analytics = analyticsResult.analytics || {};
        const analyses = analytics.analyses || [];
        const actionItems = analytics.actionItems;
        
        // Filter audio files
        const audioUploads = uploads.filter((upload: any) => 
          upload.mimeType?.startsWith('audio/') || 
          upload.originalName?.match(/\.(mp3|wav|m4a|ogg|flac|aac)$/i)
        );

        // Calculate analytics
        const totalRecordings = audioUploads.length;
        const totalAnalyses = analyses.length;
        const transcriptionRate = totalRecordings > 0 
          ? (analyses.filter((a: any) => a.transcription).length / totalRecordings) * 100
          : 0;

        // Calculate recent activity
        const recentActivity = [
          ...audioUploads.slice(0, 5).map((upload: any) => ({
            id: upload.id,
            type: 'upload',
            description: `Uploaded ${upload.originalName}`,
            timestamp: upload.uploadedAt
          })),
          ...analyses.slice(0, 5).map((analysis: any) => ({
            id: analysis.id,
            type: 'analysis',
            description: `Analyzed ${analysis.upload?.originalName || 'recording'}`,
            timestamp: analysis.createdAt
          }))
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);

        // Calculate calls by timeframe (mock data for demo)
        const callsByTimeframe = [
          { period: 'Mon', count: Math.floor(Math.random() * 10) },
          { period: 'Tue', count: Math.floor(Math.random() * 10) },
          { period: 'Wed', count: Math.floor(Math.random() * 10) },
          { period: 'Thu', count: Math.floor(Math.random() * 10) },
          { period: 'Fri', count: Math.floor(Math.random() * 10) },
          { period: 'Sat', count: Math.floor(Math.random() * 5) },
          { period: 'Sun', count: Math.floor(Math.random() * 5) }
        ];

        // Mock sentiment distribution
        const sentimentDistribution = {
          positive: Math.floor(Math.random() * 40) + 30,
          neutral: Math.floor(Math.random() * 30) + 20,
          negative: Math.floor(Math.random() * 20) + 10
        };

        setAnalyticsData({
          totalRecordings,
          totalAnalyses,
          averageCallDuration: 0, // Would need to calculate from actual data
          transcriptionRate,
          recentActivity,
          callsByTimeframe,
          sentimentDistribution,
          actionItems
        });
      }
    } catch (error) {
      Logger.error('[Analytics] Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, subtitle }: {
    title: string;
    value: string | number;
    icon: React.ElementType;
    color: string;
    subtitle?: string;
  }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
    </div>
  );

  // Show loading spinner while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" data-testid="loading-spinner"></div>
            <p className="ml-3 text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Don't render anything if user is not authenticated
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" data-testid="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">
            Monitor your call recording and analysis performance
          </p>
        </div>

        {/* Time Filter */}
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="7d">Past 7 Days</option>
              <option value="30d">Past 30 Days</option>
              <option value="90d">Past 90 Days</option>
              <option value="365d">Past Year</option>
            </select>
          </div>
        </div>

        {/* Stats Cards - Removed: Total Recordings, Analyses Completed, Transcription Rate, Processing Time as requested */}

        {/* Action Items Analytics */}
        {analyticsData?.actionItems && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-indigo-600" />
              Action Items Overview
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatCard
                title="Total Action Items"
                value={analyticsData.actionItems.total}
                icon={Target}
                color="text-indigo-600"
                subtitle={`Past ${analyticsData.actionItems.timeframe === '24h' ? '24 hours' : 
                  analyticsData.actionItems.timeframe === '7d' ? '7 days' : '30 days'}`}
              />
              <StatCard
                title="Completed"
                value={analyticsData.actionItems.completed}
                icon={CheckCircle}
                color="text-green-600"
                subtitle={`${analyticsData.actionItems.completionRate}% completion rate`}
              />
              <StatCard
                title="In Progress"
                value={analyticsData.actionItems.inProgress}
                icon={PlayCircle}
                color="text-blue-600"
              />
              <StatCard
                title="Not Started"
                value={analyticsData.actionItems.notStarted}
                icon={XCircle}
                color="text-gray-600"
              />
              <StatCard
                title="Overdue"
                value={analyticsData.actionItems.overdue}
                icon={AlertCircle}
                color="text-red-600"
                subtitle="Past deadline"
              />
            </div>

            {/* Action Items Status Chart */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Action Items Status Distribution</h3>
                <PieChart className="w-5 h-5 text-gray-500" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {analyticsData.actionItems.completed}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ 
                        width: `${analyticsData.actionItems.total > 0 ? 
                          (analyticsData.actionItems.completed / analyticsData.actionItems.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {analyticsData.actionItems.inProgress}
                  </div>
                  <div className="text-sm text-gray-600">In Progress</div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ 
                        width: `${analyticsData.actionItems.total > 0 ? 
                          (analyticsData.actionItems.inProgress / analyticsData.actionItems.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-600 mb-2">
                    {analyticsData.actionItems.notStarted}
                  </div>
                  <div className="text-sm text-gray-600">Not Started</div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gray-600 h-2 rounded-full"
                      style={{ 
                        width: `${analyticsData.actionItems.total > 0 ? 
                          (analyticsData.actionItems.notStarted / analyticsData.actionItems.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {analyticsData.actionItems.overdue}
                  </div>
                  <div className="text-sm text-gray-600">Overdue</div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ 
                        width: `${analyticsData.actionItems.total > 0 ? 
                          (analyticsData.actionItems.overdue / analyticsData.actionItems.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {analyticsData.actionItems.total > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Overall Completion Rate</span>
                    <span className="text-lg font-bold text-indigo-600">
                      {analyticsData.actionItems.completionRate}%
                    </span>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-indigo-600 h-3 rounded-full"
                      style={{ width: `${analyticsData.actionItems.completionRate}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Call Activity Chart */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Call Activity</h2>
              <TrendingUp className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="space-y-4">
              {analyticsData?.callsByTimeframe.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.period}</span>
                  <div className="flex items-center gap-2 flex-1 ml-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${(item.count / 10) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-600 w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Recent Activity</h2>
              <Activity className="w-5 h-5 text-gray-500" />
            </div>
            
            <div className="space-y-4">
              {analyticsData?.recentActivity.slice(0, 6).map((activity) => (
                <div key={activity.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.type === 'upload' ? 'bg-blue-500' : 'bg-green-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 truncate">{activity.description}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(activity.timestamp).toLocaleDateString()} at{' '}
                      {new Date(activity.timestamp).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Sentiment Analysis</h2>
            <PieChart className="w-5 h-5 text-gray-500" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {analyticsData?.sentimentDistribution.positive || 0}%
              </div>
              <div className="text-sm text-gray-600">Positive Sentiment</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600 mb-2">
                {analyticsData?.sentimentDistribution.neutral || 0}%
              </div>
              <div className="text-sm text-gray-600">Neutral Sentiment</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">
                {analyticsData?.sentimentDistribution.negative || 0}%
              </div>
              <div className="text-sm text-gray-600">Negative Sentiment</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

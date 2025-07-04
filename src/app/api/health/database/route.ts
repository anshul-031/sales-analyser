/**
 * Database Health Check API Endpoint
 * Provides database health monitoring and status information
 */

import { NextRequest, NextResponse } from 'next/server';
import { Logger } from '@/lib/utils';
import { getDatabaseStatus, databaseMonitor } from '@/lib/db-monitor';

export async function GET(request: NextRequest) {
  try {
    Logger.info('[Health Check API] Checking database health');

    const status = await getDatabaseStatus();
    const detailedStatus = await databaseMonitor.getDetailedStatus();
    const testResults = await databaseMonitor.testDatabaseOperations();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      status: {
        ...status,
        detailed: detailedStatus,
        tests: testResults,
      },
    });

  } catch (error) {
    Logger.error('[Health Check API] Health check failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();

    switch (action) {
      case 'start-monitoring':
        databaseMonitor.startMonitoring();
        return NextResponse.json({
          success: true,
          message: 'Database monitoring started',
        });

      case 'stop-monitoring':
        databaseMonitor.stopMonitoring();
        return NextResponse.json({
          success: true,
          message: 'Database monitoring stopped',
        });

      case 'test-operations':
        const testResults = await databaseMonitor.testDatabaseOperations();
        return NextResponse.json({
          success: true,
          results: testResults,
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action',
        }, { status: 400 });
    }

  } catch (error) {
    Logger.error('[Health Check API] POST request failed:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Request failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

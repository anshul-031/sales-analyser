import { NextRequest, NextResponse } from 'next/server';
import { geminiService } from '@/lib/gemini';
import { DatabaseStorage } from '@/lib/db';
import { prisma } from '@/lib/db';
import { Logger } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * @swagger
 * /api/chatbot:
 *   post:
 *     tags: [AI Chat]
 *     summary: Query analysis with AI chatbot
 *     description: Ask questions about your analysis results using natural language and get AI-powered insights
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChatRequest'
 *     responses:
 *       200:
 *         description: AI response generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ChatResponse'
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Analysis or upload not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: AI processing error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

export async function POST(request: NextRequest) {
  try {
    Logger.info('[ChatbotAPI] Processing chatbot query');
    
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }
    
    const { question, analysisId, uploadId } = await request.json();

    // Validate required parameters
    if (!question) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: userId and question are required'
      }, { status: 400 });
    }

    // Get context data based on provided IDs
    let contextData = '';
    let contextSource = '';

    if (analysisId) {
      // Get specific analysis data
      const analysis = await DatabaseStorage.getAnalysisById(analysisId);
      if (analysis && analysis.userId === user.id) {
        const upload = await DatabaseStorage.getUploadById(analysis.uploadId);
        contextData = `
**Call Recording: ${upload?.originalName || 'Unknown'}**
**Analysis Type:** ${analysis.analysisType}
**Transcription:**
${analysis.transcription || 'No transcription available'}

**Analysis Results:**
${JSON.stringify(analysis.analysisResult, null, 2)}
        `;
        contextSource = `Analysis: ${analysis.id}`;
        Logger.info('[ChatbotAPI] Using specific analysis context:', analysisId);
      } else {
        return NextResponse.json({
          success: false,
          error: 'Analysis not found or access denied'
        }, { status: 404 });
      }
    } else if (uploadId) {
      // Get specific upload data with its analyses using optimized storage
      const upload = await DatabaseStorage.getUploadById(uploadId);
      if (upload) {
        // Get the latest completed analysis for this upload
        const analysisQuery = await prisma.analysis.findFirst({
          where: { 
            uploadId,
            userId: user.id,
            status: 'COMPLETED'
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            status: true,
            createdAt: true,
          }
        });
        
        if (analysisQuery) {
          // Load transcription and analysis result on-demand
          const [transcription, analysisResult] = await Promise.all([
            DatabaseStorage.getAnalysisById(analysisQuery.id).then(a => a?.transcription).catch(() => null),
            DatabaseStorage.getAnalysisById(analysisQuery.id).then(a => a?.analysisResult).catch(() => null)
          ]);
          
          contextData = `
**Call Recording: ${upload.originalName}**
**File Size:** ${Math.round(Number(upload.fileSize) / 1024)} KB
**Upload Date:** ${new Date(upload.uploadedAt).toLocaleDateString()}

**Transcription:**
${transcription || 'No transcription available'}

**Analysis Results:**
${JSON.stringify(analysisResult, null, 2)}
          `;
          contextSource = `Upload: ${upload.originalName}`;
          Logger.info('[ChatbotAPI] Using specific upload context with optimized loading:', uploadId);
        } else {
          return NextResponse.json({
            success: false,
            error: 'No completed analysis found for this upload'
          }, { status: 404 });
        }
      } else {
        return NextResponse.json({
          success: false,
          error: 'Upload not found or access denied'
        }, { status: 404 });
      }
    } else {
      // Get all user's data as context
      const analysesWithUploads = await DatabaseStorage.getAnalysesByUser(user.id);
      const completedAnalyses = analysesWithUploads.filter(a => a.status === 'COMPLETED');
      
      if (completedAnalyses.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No completed analyses found. Please upload and analyze call recordings first.'
        }, { status: 404 });
      }

      // Create context from all completed analyses
      contextData = completedAnalyses.map((analysis, index) => `
**Call Recording ${index + 1}: ${analysis.upload?.originalName || 'Unknown'}**
**Analysis Type:** ${analysis.analysisType}
**Upload Date:** ${analysis.upload ? new Date(analysis.upload.uploadedAt).toLocaleDateString() : 'Unknown'}

**Transcription:**
${analysis.transcription || 'No transcription available'}

**Analysis Results:**
${JSON.stringify(analysis.analysisResult, null, 2)}

---
      `).join('\n');
      
      contextSource = `All analyses (${completedAnalyses.length} calls)`;
      Logger.info('[ChatbotAPI] Using all user analyses as context:', completedAnalyses.length);
    }

    // Create enhanced prompt for the chatbot
    const chatbotPrompt = `You are a helpful AI assistant specializing in call analysis. You have access to call recording transcriptions and detailed analysis results. Your role is to help users understand their call performance by answering questions about their call recordings and analysis results.

**Available Context:**
${contextData}

**User Question:** ${question}

**Instructions:**
1. Answer the user's question based on the available call recording data and analysis results
2. Be specific and reference actual content from the transcriptions and analysis when possible
3. If the question is about performance metrics, refer to the scores and detailed analysis provided
4. If asking about specific calls, mention the call recording name when relevant
5. Provide actionable insights and recommendations when appropriate
6. If the question cannot be answered with the available data, explain what information is missing
7. Keep your response conversational but professional
8. Use bullet points or numbered lists for clarity when listing multiple items
9. If referring to scores, always mention the scale (1-10) and provide context
10. **IMPORTANT: Keep responses SHORT and TO THE POINT. Provide concise answers that directly address the question without excessive detail or explanation.**

**Response Format:**
Provide a brief, clear response that directly addresses the user's question. Be concise and focus on the most important information from the call transcriptions and analysis results.`;

    // Get response from Gemini using our service with round-robin API keys
    Logger.info('[ChatbotAPI] Sending query to Gemini service');
    const answer = await geminiService.generateChatbotResponse(chatbotPrompt);

    Logger.info('[ChatbotAPI] Chatbot response generated successfully');

    return NextResponse.json({
      success: true,
      data: {
        question,
        answer,
        contextSource,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    Logger.error('[ChatbotAPI] Error processing chatbot query:', error);
    
    // Provide user-friendly error messages
    let errorMessage = 'Failed to process chatbot query';
    if (error instanceof Error) {
      if (error.message.includes('API key not valid') || error.message.includes('API_KEY_INVALID')) {
        errorMessage = 'AI service configuration error. Please check the API key configuration.';
      } else if (error.message.includes('QUOTA_EXCEEDED')) {
        errorMessage = 'AI service quota exceeded. Please try again later.';
      } else if (error.message.includes('PERMISSION_DENIED')) {
        errorMessage = 'AI service permission denied. Please check the API configuration.';
      } else {
        errorMessage = error.message;
      }
    }

    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}

// Optional: GET endpoint to retrieve chatbot conversation history
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Get user's available data for chatbot context
    const analysesWithUploads = await DatabaseStorage.getAnalysesByUser(user.id);
    const completedAnalyses = analysesWithUploads.filter(a => a.status === 'COMPLETED');

    const availableContext = completedAnalyses.map(analysis => ({
      analysisId: analysis.id,
      uploadId: analysis.uploadId,
      fileName: analysis.upload?.originalName || 'Unknown',
      analysisType: analysis.analysisType,
      uploadDate: analysis.upload?.uploadedAt,
      overallScore: (analysis.analysisResult as any)?.overallScore || 0
    }));

    return NextResponse.json({
      success: true,
      data: {
        availableContext,
        totalAnalyses: completedAnalyses.length,
        message: completedAnalyses.length > 0 
          ? 'Ready to answer questions about your call recordings and analysis results.'
          : 'No completed analyses found. Please upload and analyze call recordings first.'
      }
    });

  } catch (error) {
    Logger.error('[ChatbotAPI] Error getting chatbot context:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get chatbot context'
    }, { status: 500 });
  }
}
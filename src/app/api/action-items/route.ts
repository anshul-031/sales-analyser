import { NextRequest, NextResponse } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { Logger } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/auth';

/**
 * @swagger
 * /api/action-items:
 *   get:
 *     tags: [Action Items]
 *     summary: Get action items for analysis or user
 *     description: Retrieve action items filtered by analysis ID or user
 *     parameters:
 *       - in: query
 *         name: analysisId
 *         schema:
 *           type: string
 *         description: Analysis ID to get action items for
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *         description: Filter by action item status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH]
 *         description: Filter by action item priority
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [24h, 7d, 30d, all]
 *         description: Filter by timeframe
 *     responses:
 *       200:
 *         description: Action items retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 actionItems:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActionItem'
 *   post:
 *     tags: [Action Items]
 *     summary: Create action item
 *     description: Create a new action item for an analysis
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateActionItemRequest'
 *     responses:
 *       201:
 *         description: Action item created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 actionItem:
 *                   $ref: '#/components/schemas/ActionItem'
 *   put:
 *     tags: [Action Items]
 *     summary: Update action item
 *     description: Update an existing action item (status, comments, deadline, etc.)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id
 *             properties:
 *               id:
 *                 type: string
 *                 description: Action item ID
 *               status:
 *                 type: string
 *                 enum: [NOT_STARTED, IN_PROGRESS, COMPLETED]
 *               priority:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH]
 *               deadline:
 *                 type: string
 *                 format: date-time
 *               comments:
 *                 type: string
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Action item updated successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Action item not found
 *       500:
 *         description: Internal server error
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('analysisId');
    const status = searchParams.get('status') as 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | null;
    const priority = searchParams.get('priority') as 'LOW' | 'MEDIUM' | 'HIGH' | null;
    const timeframe = searchParams.get('timeframe') as '24h' | '7d' | '30d' | 'all' | null;

    let actionItems;

    if (analysisId) {
      // Get action items for specific analysis
      actionItems = await DatabaseStorage.getActionItemsByAnalysisId(analysisId);
    } else {
      // Get action items for user with filters
      actionItems = await DatabaseStorage.getActionItemsByUserId(user.id, {
        status: status || undefined,
        priority: priority || undefined,
        timeframe: timeframe || 'all'
      });
    }

    Logger.info('[ActionItems API] Retrieved action items:', {
      userId: user.id,
      analysisId,
      count: actionItems.length,
      filters: { status, priority, timeframe }
    });

    return NextResponse.json({
      success: true,
      actionItems
    });
  } catch (error) {
    Logger.error('[ActionItems API] Error getting action items:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve action items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }
    const body = await request.json();
    const { analysisId, title, description, priority, deadline, comments } = body;

    // Validation
    if (!analysisId || !title) {
      return NextResponse.json(
        { success: false, message: 'Analysis ID and title are required' },
        { status: 400 }
      );
    }

    // Verify the analysis belongs to the user
    const analysis = await DatabaseStorage.getAnalysisById(analysisId, { includeUser: true });
    if (!analysis || analysis.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Analysis not found or access denied' },
        { status: 404 }
      );
    }

    const actionItem = await DatabaseStorage.createActionItem({
      analysisId,
      title: title.trim(),
      description: description?.trim(),
      priority: priority || 'MEDIUM',
      deadline: deadline ? new Date(deadline) : undefined,
      comments: comments?.trim()
    });

    Logger.info('[ActionItems API] Created action item:', {
      id: actionItem.id,
      analysisId,
      userId: user.id,
      title
    });

    return NextResponse.json({
      success: true,
      actionItem
    }, { status: 201 });
  } catch (error) {
    Logger.error('[ActionItems API] Error creating action item:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create action item' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, status, priority, deadline, comments, title, description } = body;

    // Validation
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Action item ID is required' },
        { status: 400 }
      );
    }

    // Verify the action item exists and belongs to the user
    const existingActionItem = await DatabaseStorage.getActionItemsByUserId(user.id, {});
    const actionItem = existingActionItem.find((item: any) => item.id === id);
    
    if (!actionItem) {
      return NextResponse.json(
        { success: false, message: 'Action item not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (priority !== undefined) updateData.priority = priority;
    if (deadline !== undefined) updateData.deadline = deadline ? new Date(deadline) : null;
    if (comments !== undefined) updateData.comments = comments?.trim();
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim();

    const updatedActionItem = await DatabaseStorage.updateActionItem(id, updateData);

    Logger.info('[ActionItems API] Updated action item:', {
      id,
      userId: user.id,
      changes: Object.keys(updateData)
    });

    return NextResponse.json({
      success: true,
      actionItem: updatedActionItem
    });
  } catch (error) {
    Logger.error('[ActionItems API] Error updating action item:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update action item' },
      { status: 500 }
    );
  }
}

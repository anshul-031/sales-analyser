import { NextRequest, NextResponse } from 'next/server';
import { DatabaseStorage } from '@/lib/db';
import { Logger } from '@/lib/utils';
import { getAuthenticatedUser } from '@/lib/auth';
import { serializeBigInt } from '@/lib/serialization';

/**
 * @swagger
 * /api/action-item-types:
 *   get:
 *     tags: [Action Item Types]
 *     summary: Get user's action item types
 *     description: Retrieve all action item types configured by the user
 *     responses:
 *       200:
 *         description: Action item types retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 actionItemTypes:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ActionItemType'
 *   post:
 *     tags: [Action Item Types]
 *     summary: Create action item type
 *     description: Create a new action item type for the user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - prompt
 *             properties:
 *               name:
 *                 type: string
 *                 description: Name of the action item type
 *               description:
 *                 type: string
 *                 description: Description of the action item type
 *               prompt:
 *                 type: string
 *                 description: AI prompt to extract this type of action item
 *               enabled:
 *                 type: boolean
 *                 description: Whether this type is enabled
 *               color:
 *                 type: string
 *                 description: Hex color for UI display
 *               icon:
 *                 type: string
 *                 description: Icon name for UI display
 *     responses:
 *       201:
 *         description: Action item type created successfully
 *       400:
 *         description: Invalid request data
 *       409:
 *         description: Action item type with this name already exists
 *   put:
 *     tags: [Action Item Types]
 *     summary: Update action item type
 *     description: Update an existing action item type
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
 *                 description: Action item type ID
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               prompt:
 *                 type: string
 *               enabled:
 *                 type: boolean
 *               color:
 *                 type: string
 *               icon:
 *                 type: string
 *     responses:
 *       200:
 *         description: Action item type updated successfully
 *       400:
 *         description: Invalid request data
 *       404:
 *         description: Action item type not found
 *   delete:
 *     tags: [Action Item Types]
 *     summary: Delete action item type
 *     description: Delete an action item type
 *     parameters:
 *       - in: query
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Action item type ID to delete
 *     responses:
 *       200:
 *         description: Action item type deleted successfully
 *       404:
 *         description: Action item type not found
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

    const actionItemTypes = await DatabaseStorage.getActionItemTypesByUserId(user.id);

    Logger.info('[ActionItemTypes API] Retrieved action item types:', {
      userId: user.id,
      count: actionItemTypes.length
    });

    return NextResponse.json({
      success: true,
      actionItemTypes: serializeBigInt(actionItemTypes)
    });
  } catch (error) {
    Logger.error('[ActionItemTypes API] Error getting action item types:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to retrieve action item types' },
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
    const { name, description, prompt, enabled = true, color, icon } = body;

    // Validation
    if (!name || !prompt) {
      return NextResponse.json(
        { success: false, message: 'Name and prompt are required' },
        { status: 400 }
      );
    }

    // Check for duplicate name
    const existingTypes = await DatabaseStorage.getActionItemTypesByUserId(user.id);
    if (existingTypes.some((type: any) => type.name.toLowerCase() === name.toLowerCase())) {
      return NextResponse.json(
        { success: false, message: 'Action item type with this name already exists' },
        { status: 409 }
      );
    }

    const actionItemType = await DatabaseStorage.createActionItemType({
      userId: user.id,
      name: name.trim(),
      description: description?.trim(),
      prompt: prompt.trim(),
      enabled,
      color: color?.trim(),
      icon: icon?.trim()
    });

    Logger.info('[ActionItemTypes API] Created action item type:', {
      id: actionItemType.id,
      userId: user.id,
      name
    });

    return NextResponse.json({
      success: true,
      actionItemType: serializeBigInt(actionItemType)
    }, { status: 201 });
  } catch (error) {
    Logger.error('[ActionItemTypes API] Error creating action item type:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create action item type' },
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
    const { id, name, description, prompt, enabled, color, icon } = body;

    // Validation
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Action item type ID is required' },
        { status: 400 }
      );
    }

    // Verify the action item type exists and belongs to the user
    const existingType = await DatabaseStorage.getActionItemTypeById(id);
    if (!existingType || existingType.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Action item type not found' },
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being changed
    if (name && name !== existingType.name) {
      const existingTypes = await DatabaseStorage.getActionItemTypesByUserId(user.id);
      if (existingTypes.some((type: any) => type.id !== id && type.name.toLowerCase() === name.toLowerCase())) {
        return NextResponse.json(
          { success: false, message: 'Action item type with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim();
    if (prompt !== undefined) updateData.prompt = prompt.trim();
    if (enabled !== undefined) updateData.enabled = enabled;
    if (color !== undefined) updateData.color = color?.trim();
    if (icon !== undefined) updateData.icon = icon?.trim();

    const updatedActionItemType = await DatabaseStorage.updateActionItemType(id, updateData);

    Logger.info('[ActionItemTypes API] Updated action item type:', {
      id,
      userId: user.id,
      changes: Object.keys(updateData)
    });

    return NextResponse.json({
      success: true,
      actionItemType: serializeBigInt(updatedActionItemType)
    });
  } catch (error) {
    Logger.error('[ActionItemTypes API] Error updating action item type:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update action item type' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'Action item type ID is required' },
        { status: 400 }
      );
    }

    // Verify the action item type exists and belongs to the user
    const existingType = await DatabaseStorage.getActionItemTypeById(id);
    if (!existingType || existingType.userId !== user.id) {
      return NextResponse.json(
        { success: false, message: 'Action item type not found' },
        { status: 404 }
      );
    }

    await DatabaseStorage.deleteActionItemType(id);

    Logger.info('[ActionItemTypes API] Deleted action item type:', {
      id,
      userId: user.id,
      name: existingType.name
    });

    return NextResponse.json({
      success: true,
      message: 'Action item type deleted successfully'
    });
  } catch (error) {
    Logger.error('[ActionItemTypes API] Error deleting action item type:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete action item type' },
      { status: 500 }
    );
  }
}

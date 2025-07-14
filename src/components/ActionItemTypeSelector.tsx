'use client';

import React, { useState, useEffect } from 'react';
import { ClipboardList, ChevronDown, ChevronUp, Plus, Edit3, X, Save, Loader2 } from 'lucide-react';

interface ActionItemType {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  enabled: boolean;
  color?: string;
  icon?: string;
}

interface ActionItemTypeSelectorProps {
  userId: string;
  selectedTypes: string[];
  onSelectionChange: (selectedTypeIds: string[]) => void;
}

export default function ActionItemTypeSelector({ 
  userId, 
  selectedTypes, 
  onSelectionChange 
}: ActionItemTypeSelectorProps) {
  const [actionItemTypes, setActionItemTypes] = useState<ActionItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadActionItemTypes();
  }, [userId]);

  const loadActionItemTypes = async () => {
    if (!userId) return;
    
    try {
      setLoading(true);
      const response = await fetch('/api/action-item-types');
      const data = await response.json();
      
      if (data.success) {
        setActionItemTypes(data.actionItemTypes);
        // If no types are selected and we have types, select all enabled ones by default
        if (selectedTypes.length === 0 && data.actionItemTypes.length > 0) {
          const enabledTypeIds = data.actionItemTypes
            .filter((type: ActionItemType) => type.enabled)
            .map((type: ActionItemType) => type.id);
          onSelectionChange(enabledTypeIds);
        }
      } else {
        console.error('Failed to load action item types:', data.message);
      }
    } catch (error) {
      console.error('Error loading action item types:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeToggle = (typeId: string) => {
    const newSelection = selectedTypes.includes(typeId)
      ? selectedTypes.filter(id => id !== typeId)
      : [...selectedTypes, typeId];
    onSelectionChange(newSelection);
  };

  const handleCreateNew = () => {
    const newType: ActionItemType = {
      id: `new_${Date.now()}`,
      name: 'New Action Item Type',
      description: 'Custom action item type',
      prompt: 'Look for instances where...',
      enabled: true,
      color: '#3B82F6'
    };
    setActionItemTypes(prev => [...prev, newType]);
    setEditingType(newType.id);
    setCreating(true);
  };

  const handleSaveType = async (typeId: string, updates: Partial<ActionItemType>) => {
    if (!updates.name?.trim() || !updates.prompt?.trim()) {
      alert('Name and prompt are required');
      return;
    }

    try {
      setSaving(typeId);
      
      const isNew = creating && typeId.startsWith('new_');
      const endpoint = '/api/action-item-types';
      const method = isNew ? 'POST' : 'PUT';
      
      const payload = isNew 
        ? {
            name: updates.name,
            description: updates.description,
            prompt: updates.prompt,
            enabled: updates.enabled ?? true,
            color: updates.color,
            icon: updates.icon
          }
        : {
            id: typeId,
            ...updates
          };

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (data.success) {
        if (isNew) {
          // Replace the temporary item with the real one from the server
          setActionItemTypes(prev => 
            prev.map(type => 
              type.id === typeId 
                ? { ...data.actionItemType, enabled: true }
                : type
            )
          );
          // Update selection to use the real ID
          const newSelection = selectedTypes.map(id => id === typeId ? data.actionItemType.id : id);
          onSelectionChange(newSelection);
          setCreating(false);
        } else {
          // Update existing item
          setActionItemTypes(prev => 
            prev.map(type => 
              type.id === typeId 
                ? { ...type, ...updates }
                : type
            )
          );
        }
        setEditingType(null);
      } else {
        alert(`Failed to save: ${data.message}`);
        if (isNew) {
          // Remove the temporary item if save failed
          setActionItemTypes(prev => prev.filter(type => type.id !== typeId));
          setCreating(false);
        }
      }
    } catch (error) {
      console.error('Error saving action item type:', error);
      alert('Failed to save action item type');
      if (creating) {
        setActionItemTypes(prev => prev.filter(type => type.id !== typeId));
        setCreating(false);
      }
    } finally {
      setSaving(null);
    }
  };

  const handleDeleteType = async (typeId: string) => {
    if (!confirm('Are you sure you want to delete this action item type?')) {
      return;
    }

    try {
      setSaving(typeId);
      const response = await fetch(`/api/action-item-types?id=${typeId}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setActionItemTypes(prev => prev.filter(type => type.id !== typeId));
        const newSelection = selectedTypes.filter(id => id !== typeId);
        onSelectionChange(newSelection);
      } else {
        alert(`Failed to delete: ${data.message}`);
      }
    } catch (error) {
      console.error('Error deleting action item type:', error);
      alert('Failed to delete action item type');
    } finally {
      setSaving(null);
    }
  };

  const selectedCount = selectedTypes.length;
  const enabledTypes = actionItemTypes.filter(type => selectedTypes.includes(type.id));

  if (loading) {
    return (
      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
        <div className="flex items-center space-x-2">
          <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
          <span className="text-sm text-green-700">Loading action item types...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <ClipboardList className="w-5 h-5 text-green-600" />
          <h3 className="font-semibold text-green-800">
            Action Item Types ({selectedCount} selected)
          </h3>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-green-600 hover:text-green-800 flex items-center space-x-1"
          >
            {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span>{showDetails ? 'Hide' : 'Customize'}</span>
          </button>
          <button
            onClick={handleCreateNew}
            className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
          >
            <Plus className="w-3 h-3" />
            <span>Add New</span>
          </button>
        </div>
      </div>
      
      <p className="text-sm text-green-700 mb-3">
        Select which types of action items you want the AI to identify and track:
      </p>

      {!showDetails ? (
        // Compact view - show selected types
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {enabledTypes.length > 0 ? (
            enabledTypes.map((type) => (
              <div key={type.id} className="flex items-start space-x-2 text-sm">
                <div 
                  className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                  style={{ backgroundColor: type.color || '#10B981' }}
                ></div>
                <div>
                  <span className="font-medium text-green-800">{type.name}</span>
                  {type.description && (
                    <p className="text-green-600 text-xs mt-0.5">{type.description}</p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-green-600 col-span-2">
              No action item types selected. Click "Customize" to select types.
            </div>
          )}
        </div>
      ) : (
        // Detailed view - show all types with checkboxes and editing
        <div className="space-y-3">
          {actionItemTypes.map((type) => (
            <div key={type.id} className="border border-green-200 rounded-lg p-3 bg-white">
              {editingType === type.id ? (
                <EditTypeForm
                  type={type}
                  onSave={(updates) => handleSaveType(type.id, updates)}
                  onCancel={() => {
                    setEditingType(null);
                    if (creating && type.id.startsWith('new_')) {
                      setActionItemTypes(prev => prev.filter(t => t.id !== type.id));
                      setCreating(false);
                    }
                  }}
                  saving={saving === type.id}
                />
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedTypes.includes(type.id)}
                      onChange={() => handleTypeToggle(type.id)}
                      className="w-4 h-4 text-green-600 rounded focus:ring-2 focus:ring-green-500 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: type.color || '#10B981' }}
                        ></div>
                        <h4 className={`font-medium text-sm ${
                          selectedTypes.includes(type.id) ? 'text-gray-800' : 'text-gray-500'
                        }`}>
                          {type.name}
                        </h4>
                      </div>
                      {type.description && (
                        <p className={`text-xs mt-1 ${
                          selectedTypes.includes(type.id) ? 'text-gray-600' : 'text-gray-400'
                        }`}>
                          {type.description}
                        </p>
                      )}
                      <p className={`text-xs mt-1 italic ${
                        selectedTypes.includes(type.id) ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        "{type.prompt.substring(0, 60)}{type.prompt.length > 60 ? '...' : ''}"
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={() => setEditingType(type.id)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="Edit type"
                      disabled={saving === type.id}
                    >
                      {saving === type.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Edit3 className="w-3 h-3" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteType(type.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                      title="Delete type"
                      disabled={saving === type.id}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Edit Type Form Component
interface EditTypeFormProps {
  type: ActionItemType;
  onSave: (updates: Partial<ActionItemType>) => void;
  onCancel: () => void;
  saving: boolean;
}

function EditTypeForm({ type, onSave, onCancel, saving }: EditTypeFormProps) {
  const [name, setName] = useState(type.name);
  const [description, setDescription] = useState(type.description || '');
  const [prompt, setPrompt] = useState(type.prompt);
  const [color, setColor] = useState(type.color || '#10B981');

  const handleSave = () => {
    if (!name.trim() || !prompt.trim()) {
      return;
    }
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      prompt: prompt.trim(),
      color: color
    });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Type Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
            placeholder="e.g., Follow-up Call"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Color
          </label>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-full h-8 border border-gray-300 rounded cursor-pointer"
          />
        </div>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent"
          placeholder="Brief description of this action item type"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">
          AI Detection Prompt *
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-green-500 focus:border-transparent resize-none"
          placeholder="Instructions for AI to identify this type of action item..."
        />
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={handleSave}
          disabled={!name.trim() || !prompt.trim() || saving}
          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-1"
        >
          {saving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-3 h-3" />
              <span>Save</span>
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1 text-gray-600 text-xs border border-gray-300 rounded hover:bg-gray-50 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

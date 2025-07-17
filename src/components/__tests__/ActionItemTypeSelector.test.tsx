import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActionItemTypeSelector from '../ActionItemTypeSelector';

// Mock fetch
global.fetch = jest.fn();

const mockOnSelectionChange = jest.fn();

const mockActionItemTypes = [
  {
    id: '1',
    name: 'Follow-up Call',
    description: 'Schedule follow-up calls',
    prompt: 'Look for instances where follow-up calls are mentioned',
    enabled: true,
    color: '#10B981'
  },
  {
    id: '2',
    name: 'Send Document',
    description: 'Send documents to customers',
    prompt: 'Look for instances where documents need to be sent',
    enabled: true,
    color: '#3B82F6'
  }
];

beforeEach(() => {
  jest.clearAllMocks();
  (fetch as jest.Mock).mockClear();
});

describe('ActionItemTypeSelector', () => {
  it('renders loading state initially', async () => {
    (fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(
      <ActionItemTypeSelector
        userId="user123"
        selectedTypes={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(screen.getByText('Loading action item types...')).toBeInTheDocument();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('loads and displays action item types successfully', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        actionItemTypes: mockActionItemTypes
      })
    });

    render(
      <ActionItemTypeSelector
        userId="user123"
        selectedTypes={['1']}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Action Item Types (1 selected)')).toBeInTheDocument();
    });

    // Should show the selected type in compact view
    expect(screen.getByText('Follow-up Call')).toBeInTheDocument();
    expect(screen.getByText('Schedule follow-up calls')).toBeInTheDocument();
  });

  it('selects all enabled types by default when none are selected', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        actionItemTypes: mockActionItemTypes
      })
    });

    render(
      <ActionItemTypeSelector
        userId="user123"
        selectedTypes={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    await waitFor(() => {
      expect(mockOnSelectionChange).toHaveBeenCalledWith(['1', '2']);
    });
  });

  it('toggles between compact and detailed view', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        actionItemTypes: mockActionItemTypes
      })
    });

    render(
      <ActionItemTypeSelector
        userId="user123"
        selectedTypes={['1']}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Customize')).toBeInTheDocument();
    });

    // Click to show detailed view
    fireEvent.click(screen.getByText('Customize'));

    await waitFor(() => {
      expect(screen.getByText('Hide')).toBeInTheDocument();
    });

    // Should show checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);

    // Click to hide detailed view
    fireEvent.click(screen.getByText('Hide'));

    await waitFor(() => {
      expect(screen.getByText('Customize')).toBeInTheDocument();
    });
  });

  it('handles type selection in detailed view', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        actionItemTypes: mockActionItemTypes
      })
    });

    render(
      <ActionItemTypeSelector
        userId="user123"
        selectedTypes={['1']}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Open detailed view
    await waitFor(() => {
      fireEvent.click(screen.getByText('Customize'));
    });

    // Get all checkboxes
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
      
      // First checkbox should be checked
      expect(checkboxes[0]).toBeChecked();
      
      // Click the second checkbox
      fireEvent.click(checkboxes[1]);
    });

    expect(mockOnSelectionChange).toHaveBeenCalledWith(['1', '2']);
  });

  it('shows no types selected message in compact view', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        actionItemTypes: mockActionItemTypes
      })
    });

    render(
      <ActionItemTypeSelector
        userId="user123"
        selectedTypes={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Wait for loading to complete and auto-selection to happen
    await waitFor(() => {
      expect(mockOnSelectionChange).toHaveBeenCalled();
    });

    // Reset the component with empty selection to test the message
    jest.clearAllMocks();
    
    render(
      <ActionItemTypeSelector
        userId="user123"
        selectedTypes={[]}
        onSelectionChange={jest.fn()}
      />
    );

    // Mock the second call to return the same data but skip auto-selection
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        actionItemTypes: mockActionItemTypes
      })
    });

    await waitFor(() => {
      expect(screen.getByText('No action item types selected. Click "Customize" to select types.')).toBeInTheDocument();
    });
  });

  it('does not load types when userId is not provided', () => {
    render(
      <ActionItemTypeSelector
        userId=""
        selectedTypes={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it('handles API errors when loading types', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: false,
        message: 'Failed to load types'
      })
    });

    render(
      <ActionItemTypeSelector
        userId="user123"
        selectedTypes={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to load action item types:', 'Failed to load types');
    });

    consoleSpy.mockRestore();
  });

  it('handles network errors when loading types', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(
      <ActionItemTypeSelector
        userId="user123"
        selectedTypes={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error loading action item types:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('displays proper colors for action item types', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        actionItemTypes: mockActionItemTypes
      })
    });

    render(
      <ActionItemTypeSelector
        userId="user123"
        selectedTypes={['1', '2']}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    await waitFor(() => {
      const colorDots = document.querySelectorAll('[style*="background-color"]');
      expect(colorDots.length).toBeGreaterThan(0);
    });
  });

  it('renders "Add New" button', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        actionItemTypes: mockActionItemTypes
      })
    });

    render(
      <ActionItemTypeSelector
        userId="user123"
        selectedTypes={[]}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Add New')).toBeInTheDocument();
    });
  });

  it('renders edit and delete buttons in detailed view', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      json: () => Promise.resolve({
        success: true,
        actionItemTypes: mockActionItemTypes
      })
    });

    render(
      <ActionItemTypeSelector
        userId="user123"
        selectedTypes={['1']}
        onSelectionChange={mockOnSelectionChange}
      />
    );

    // Open detailed view
    await waitFor(() => {
      fireEvent.click(screen.getByText('Customize'));
    });

    await waitFor(() => {
      const editButtons = screen.getAllByTitle('Edit type');
      const deleteButtons = screen.getAllByTitle('Delete type');
      expect(editButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);
    });
  });
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContactForm from '../ContactForm';

// Mock fetch
global.fetch = jest.fn();

describe('ContactForm Component', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  it('does not render when isOpen is false', () => {
    render(<ContactForm isOpen={false} onClose={mockOnClose} />);
    
    expect(screen.queryByText('Contact Us')).not.toBeInTheDocument();
  });

  it('renders form when isOpen is true', () => {
    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Contact Us')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('updates form data when inputs change', () => {
    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    
    fireEvent.change(nameInput, { target: { value: 'John Doe' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    
    expect(nameInput).toHaveValue('John Doe');
    expect(emailInput).toHaveValue('john@example.com');
  });

  it('submits form with correct data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });

    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/company/i), { target: { value: 'ACME Corp' } });
    fireEvent.change(screen.getByLabelText(/phone/i), { target: { value: '123-456-7890' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Test message' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'John Doe',
          email: 'john@example.com',
          company: 'ACME Corp',
          phone: '123-456-7890',
          message: 'Test message',
        }),
      });
    });
  });

  it('shows loading state during submission', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      new Promise((resolve) => setTimeout(() => resolve({ json: () => ({ success: true }) }), 100))
    );

    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    // Fill minimal required fields
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Test' } });
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);
    
    // Check for loading state
    expect(screen.getByText(/sending/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('shows success message after successful submission', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });

    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Test' } });
    
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Message Sent!')).toBeInTheDocument();
    });
  });

  it('shows error message when submission fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: 'Server error' }),
    });

    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Test' } });
    
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });

  it('handles network errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    // Fill and submit form
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Test' } });
    
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    
    await waitFor(() => {
      expect(screen.getByText('An error occurred. Please try again.')).toBeInTheDocument();
    });
  });

  it('clears form after successful submission', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });

    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    const nameInput = screen.getByLabelText(/name/i);
    const emailInput = screen.getByLabelText(/email/i);
    const messageInput = screen.getByLabelText(/message/i);
    
    // Fill form
    fireEvent.change(nameInput, { target: { value: 'John' } });
    fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
    fireEvent.change(messageInput, { target: { value: 'Test message' } });
    
    // Submit
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Message Sent!')).toBeInTheDocument();
    });
    
    // Close success message and check form is cleared
    fireEvent.click(screen.getByRole('button', { name: /close success message/i }));
    
    // After closing the success message, the form should be back and cleared
    // We need to wait for the UI to update and then re-query the inputs
    await waitFor(() => {
      // Check that we're back to the form (success message should be gone)
      expect(screen.queryByText('Message Sent!')).not.toBeInTheDocument();
      
      // Re-query the inputs and check they are cleared
      const newNameInput = screen.getByLabelText(/name/i);
      const newEmailInput = screen.getByLabelText(/email/i);
      const newMessageInput = screen.getByLabelText(/message/i);
      
      expect(newNameInput).toHaveValue('');
      expect(newEmailInput).toHaveValue('');
      expect(newMessageInput).toHaveValue('');
    });
  });

  it('resets success and error states when closing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true }),
    });

    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    // Submit form to show success
    fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'john@example.com' } });
    fireEvent.change(screen.getByLabelText(/message/i), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Message Sent!')).toBeInTheDocument();
    });
    
    // Close modal
    const closeButton = screen.getByRole('button', { name: /close success message/i });
    fireEvent.click(closeButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('prevents submission with empty required fields', () => {
    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    const submitButton = screen.getByRole('button', { name: /send message/i });
    fireEvent.click(submitButton);
    
    // Form should not submit if required fields are empty
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handles textarea input correctly', () => {
    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    const messageTextarea = screen.getByLabelText(/message/i);
    fireEvent.change(messageTextarea, { target: { value: 'This is a long message\nwith multiple lines' } });
    
    expect(messageTextarea).toHaveValue('This is a long message\nwith multiple lines');
  });

  it('closes modal when clicking outside the form', () => {
    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    const overlay = screen.getByRole('dialog').parentElement;
    fireEvent.click(overlay!);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('has proper accessibility attributes', () => {
    render(<ContactForm isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toHaveAttribute('name', 'name');
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText(/phone/i)).toHaveAttribute('type', 'tel');
  });
});

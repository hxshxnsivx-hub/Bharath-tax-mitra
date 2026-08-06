import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PersonalInfoForm } from '../PersonalInfoForm';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';

// Mock the database
vi.mock('../../lib/db', () => ({
  db: {
    savedDrafts: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

const renderWithI18n = (component: React.ReactElement) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('PersonalInfoForm', () => {
  const mockOnSave = vi.fn();
  const sessionId = 'test-session-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all form fields', () => {
    renderWithI18n(<PersonalInfoForm sessionId={sessionId} onSave={mockOnSave} />);

    expect(screen.getByLabelText(/PAN Number/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Birth/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Aadhaar Number/i)).toBeInTheDocument();
  });

  it('validates PAN format correctly', async () => {
    renderWithI18n(<PersonalInfoForm sessionId={sessionId} onSave={mockOnSave} />);

    const panInput = screen.getByLabelText(/PAN Number/i);
    
    // Invalid PAN
    fireEvent.change(panInput, { target: { value: 'INVALID' } });
    fireEvent.blur(panInput);

    await waitFor(() => {
      expect(screen.getByText(/PAN format should be AAAAA9999A/i)).toBeInTheDocument();
    });

    // Valid PAN
    fireEvent.change(panInput, { target: { value: 'ABCDE1234F' } });
    fireEvent.blur(panInput);

    await waitFor(() => {
      expect(screen.getByText(/Valid/i)).toBeInTheDocument();
    });
  });

  it('validates email format correctly', async () => {
    renderWithI18n(<PersonalInfoForm sessionId={sessionId} onSave={mockOnSave} />);

    const emailInput = screen.getByLabelText(/Email Address/i);
    
    // Invalid email
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    });

    // Valid email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.queryByText(/Please enter a valid email address/i)).not.toBeInTheDocument();
    });
  });

  it('validates DOB age requirements', async () => {
    renderWithI18n(<PersonalInfoForm sessionId={sessionId} onSave={mockOnSave} />);

    const dobInput = screen.getByLabelText(/Date of Birth/i);
    
    // Too young (less than 18)
    const recentDate = new Date();
    recentDate.setFullYear(recentDate.getFullYear() - 10);
    const recentDateStr = `${String(recentDate.getDate()).padStart(2, '0')}/${String(recentDate.getMonth() + 1).padStart(2, '0')}/${recentDate.getFullYear()}`;
    
    fireEvent.change(dobInput, { target: { value: recentDateStr } });
    fireEvent.blur(dobInput);

    await waitFor(() => {
      expect(screen.getByText(/You must be at least 18 years old/i)).toBeInTheDocument();
    });

    // Valid age (25 years old)
    const validDate = new Date();
    validDate.setFullYear(validDate.getFullYear() - 25);
    const validDateStr = `${String(validDate.getDate()).padStart(2, '0')}/${String(validDate.getMonth() + 1).padStart(2, '0')}/${validDate.getFullYear()}`;
    
    fireEvent.change(dobInput, { target: { value: validDateStr } });
    fireEvent.blur(dobInput);

    await waitFor(() => {
      expect(screen.queryByText(/You must be at least 18 years old/i)).not.toBeInTheDocument();
    });
  });

  it('formats and masks Aadhaar number correctly', async () => {
    renderWithI18n(<PersonalInfoForm sessionId={sessionId} onSave={mockOnSave} />);

    const aadhaarInput = screen.getByLabelText(/Aadhaar Number/i);
    
    // Enter 12 digits
    fireEvent.change(aadhaarInput, { target: { value: '123456789012' } });

    await waitFor(() => {
      // Should be masked as XXXX-XXXX-9012
      expect(aadhaarInput).toHaveValue('XXXX-XXXX-9012');
    });
  });

  it('converts PAN to uppercase automatically', async () => {
    renderWithI18n(<PersonalInfoForm sessionId={sessionId} onSave={mockOnSave} />);

    const panInput = screen.getByLabelText(/PAN Number/i);
    
    fireEvent.change(panInput, { target: { value: 'abcde1234f' } });

    await waitFor(() => {
      expect(panInput).toHaveValue('ABCDE1234F');
    });
  });

  it('shows validation errors on submit with invalid data', async () => {
    renderWithI18n(<PersonalInfoForm sessionId={sessionId} onSave={mockOnSave} />);

    const submitButton = screen.getByText(/Save & Continue/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/PAN number is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Full name is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Date of birth is required/i)).toBeInTheDocument();
      expect(screen.getByText(/^Address is required$/i)).toBeInTheDocument();
      expect(screen.getByText(/Email address is required/i)).toBeInTheDocument();
    });

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave with valid data', async () => {
    renderWithI18n(<PersonalInfoForm sessionId={sessionId} onSave={mockOnSave} />);

    // Fill in all required fields
    fireEvent.change(screen.getByLabelText(/PAN Number/i), { target: { value: 'ABCDE1234F' } });
    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'John Doe' } });
    fireEvent.change(screen.getByLabelText(/Date of Birth/i), { target: { value: '01/01/1990' } });
    fireEvent.change(screen.getByLabelText(/^Address/i), { target: { value: '123 Main Street, City, State' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'john@example.com' } });

    const submitButton = screen.getByText(/Save & Continue/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        pan: 'ABCDE1234F',
        fullName: 'John Doe',
        dob: '01/01/1990',
        address: '123 Main Street, City, State',
        email: 'john@example.com',
        aadhaar: '',
      });
    });
  });

  it('loads initial data when provided', () => {
    const initialData = {
      pan: 'ABCDE1234F',
      fullName: 'Jane Doe',
      dob: '15/05/1985',
      address: '456 Oak Avenue',
      email: 'jane@example.com',
    };

    renderWithI18n(
      <PersonalInfoForm 
        sessionId={sessionId} 
        initialData={initialData}
        onSave={mockOnSave} 
      />
    );

    expect(screen.getByLabelText(/PAN Number/i)).toHaveValue('ABCDE1234F');
    expect(screen.getByLabelText(/Full Name/i)).toHaveValue('Jane Doe');
    expect(screen.getByLabelText(/Date of Birth/i)).toHaveValue('15/05/1985');
    expect(screen.getByLabelText(/^Address/i)).toHaveValue('456 Oak Avenue');
    expect(screen.getByLabelText(/Email Address/i)).toHaveValue('jane@example.com');
  });
});

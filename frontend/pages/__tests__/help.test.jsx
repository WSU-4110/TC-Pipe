/**
 * Unit tests for frontend/pages/help.jsx (class owner: Mazino Amuwha)
 * Framework: Jest + React Testing Library
 *
 * Methods / units under test:
 *   1. Topic            - accordion row for each guide and FAQ entry
 *   2. openReport       - "Report a Bug" button switches to the form view
 *   3. backToHelp       - "Cancel" returns from the form to the guides
 *   4. handleChange     - typing updates the form, the counter and clears errors
 *   5. validate         - required-field and email checks on submit
 *   6. handleSubmit     - successful submit shows the confirmation screen
 *   7. sendReport       - failure path (?mock=fail) and reference number format
 *   8. goBack           - "Go Back" navigates back, or to /dashboard
 */
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Help from '../help.jsx';

// TopNav and Assistant call the backend and read login data; they are not part of Help.
jest.mock('../components/TopNav.jsx', () => ({ __esModule: true, default: () => <nav data-testid="topnav" /> }));
jest.mock('../components/Assistant.jsx', () => ({ __esModule: true, default: () => <div data-testid="assistant" /> }));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderHelp = (url = '/help') =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Help />
    </MemoryRouter>
  );

const openForm = () => fireEvent.click(screen.getAllByRole('button', { name: 'Report a Bug' })[0]);

beforeEach(() => {
  mockNavigate.mockClear();
  window.scrollTo = jest.fn();
});

describe('1. Topic', () => {
  test('renders every guide and FAQ title, closed by default', () => {
    const { container } = renderHelp();
    expect(screen.getByText('Registering and logging in')).toBeInTheDocument();
    expect(screen.getByText('Profile settings and deal defaults')).toBeInTheDocument();
    expect(screen.getByText('Why is my deal marked High risk?')).toBeInTheDocument();
    expect(container.querySelectorAll('details.topic')).toHaveLength(12); // 5 guides + 7 FAQ
    expect(container.querySelectorAll('details[open]')).toHaveLength(0);
  });

  test('opening a topic shows its body text and links', () => {
    renderHelp();
    const row = screen.getByText('The dashboard').closest('details');
    row.open = true;
    expect(row).toHaveTextContent('Needs Attention');
    expect(within_(row, 'Dashboard')).toHaveAttribute('href', '/dashboard');
  });
});
function within_(row, name) {
  return Array.from(row.querySelectorAll('a')).find(a => a.textContent === name);
}

describe('2. openReport', () => {
  test('clicking Report a Bug hides the guides and shows the form', () => {
    renderHelp();
    expect(screen.getByRole('heading', { name: 'Help guides' })).toBeInTheDocument();
    openForm();
    expect(screen.getByRole('heading', { name: 'Report a Bug' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Help guides' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Issue category/)).toHaveFocus();
  });

  test('opening /help#report starts on the form', () => {
    renderHelp('/help#report');
    expect(screen.getByRole('heading', { name: 'Report a Bug' })).toBeInTheDocument();
  });
});

describe('3. backToHelp', () => {
  test('Cancel returns to the guides', () => {
    renderHelp();
    openForm();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('heading', { name: 'Help guides' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Describe the issue/)).not.toBeInTheDocument();
  });
});

describe('4. handleChange', () => {
  test('typing updates the field and the character counter', async () => {
    renderHelp();
    openForm();
    const box = screen.getByLabelText(/Describe the issue/);
    await userEvent.type(box, 'Save fails');
    expect(box).toHaveValue('Save fails');
    expect(screen.getByText('10 / 2,000')).toBeInTheDocument();
  });

  test('fixing a field clears its red border', () => {
    renderHelp();
    openForm();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    const select = screen.getByLabelText(/Issue category/);
    expect(select).toHaveAttribute('aria-invalid', 'true');
    fireEvent.change(select, { target: { name: 'category', value: 'save' } });
    expect(select).not.toHaveAttribute('aria-invalid');
  });
});

describe('5. validate', () => {
  test('empty form shows the required-fields error and does not submit', () => {
    renderHelp();
    openForm();
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please fill in all required fields');
    expect(screen.getByLabelText(/Issue category/)).toHaveFocus();
    expect(screen.queryByText(/Thanks, your report was submitted/)).not.toBeInTheDocument();
  });

  test('a description made only of spaces still counts as empty', () => {
    renderHelp();
    openForm();
    fireEvent.change(screen.getByLabelText(/Issue category/), { target: { name: 'category', value: 'data' } });
    fireEvent.change(screen.getByLabelText(/Describe the issue/), { target: { name: 'description', value: '    ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByLabelText(/Describe the issue/)).toHaveAttribute('aria-invalid', 'true');
  });

  test('a badly formed optional email is rejected', () => {
    renderHelp();
    openForm();
    fireEvent.change(screen.getByLabelText(/Issue category/), { target: { name: 'category', value: 'login' } });
    fireEvent.change(screen.getByLabelText(/Describe the issue/), { target: { name: 'description', value: 'Cannot log in' } });
    fireEvent.change(screen.getByLabelText(/Email address/), { target: { name: 'email', value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address or leave the field blank');
    expect(screen.getByLabelText(/Email address/)).toHaveFocus();
  });
});

describe('6. handleSubmit', () => {
  test('valid report shows the confirmation with a reference number and email note', async () => {
    jest.useFakeTimers();
    try {
      renderHelp();
      openForm();
      fireEvent.change(screen.getByLabelText(/Issue category/), { target: { name: 'category', value: 'save' } });
      fireEvent.change(screen.getByLabelText(/Describe the issue/), { target: { name: 'description', value: '  Save does nothing  ' } });
      fireEvent.change(screen.getByLabelText(/Email address/), { target: { name: 'email', value: 'mazino@example.com' } });
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
      expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled();
      await act(async () => { jest.advanceTimersByTime(500); });
      expect(screen.getByText('Thanks, your report was submitted')).toBeInTheDocument();
      expect(screen.getByText(/confirmation email to mazino@example.com/)).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  test('Back to Help from the confirmation shows the guides again', async () => {
    jest.useFakeTimers();
    try {
      renderHelp();
      openForm();
      fireEvent.change(screen.getByLabelText(/Issue category/), { target: { name: 'category', value: 'other' } });
      fireEvent.change(screen.getByLabelText(/Describe the issue/), { target: { name: 'description', value: 'x' } });
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
      await act(async () => { jest.advanceTimersByTime(500); });
      fireEvent.click(screen.getByRole('button', { name: 'Back to Help' }));
      expect(screen.getByRole('heading', { name: 'Help guides' })).toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('7. sendReport', () => {
  test('reference number looks like BR-YYYYMMDD-XXXXXXXX and no email line without an email', async () => {
    jest.useFakeTimers();
    try {
      renderHelp();
      openForm();
      fireEvent.change(screen.getByLabelText(/Issue category/), { target: { name: 'category', value: 'display' } });
      fireEvent.change(screen.getByLabelText(/Describe the issue/), { target: { name: 'description', value: 'Layout broken' } });
      fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
      await act(async () => { jest.advanceTimersByTime(500); });
      const ref = document.querySelector('.ref').textContent;
      expect(ref).toMatch(/^BR-\d{8}-[0-9A-F]{8}$/);
      expect(screen.queryByText(/confirmation email/)).not.toBeInTheDocument();
    } finally {
      jest.useRealTimers();
    }
  });

  test('?mock=fail shows the failure message and keeps the form', async () => {
    renderHelp('/help?mock=fail');
    openForm();
    fireEvent.change(screen.getByLabelText(/Issue category/), { target: { name: 'category', value: 'data' } });
    fireEvent.change(screen.getByLabelText(/Describe the issue/), { target: { name: 'description', value: 'Wrong dates' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('We could not submit your report. Please try again later.')
    );
    expect(screen.getByLabelText(/Describe the issue/)).toHaveValue('Wrong dates');
  });
});

describe('8. goBack', () => {
  test('Go Back goes one page back when there is history', () => {
    Object.defineProperty(window.history, 'length', { value: 3, configurable: true });
    renderHelp();
    fireEvent.click(screen.getByRole('button', { name: /Go Back/ }));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  test('Go Back falls back to /dashboard when Help was opened directly', () => {
    Object.defineProperty(window.history, 'length', { value: 1, configurable: true });
    renderHelp();
    fireEvent.click(screen.getByRole('button', { name: /Go Back/ }));
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });
});

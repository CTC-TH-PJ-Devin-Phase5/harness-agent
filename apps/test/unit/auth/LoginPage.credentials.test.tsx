import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { LanguageProvider } from '@/modules/auth/hooks/useLang';

function renderLoginPage(): ReturnType<typeof render> {
  return render(
    <LanguageProvider>
      <LoginPage onAuthSuccess={vi.fn()} />
    </LanguageProvider>
  );
}

describe('LoginPage — credentials step', () => {
  it('renders app logo area with title "Company Car Booking" and subtitle', () => {
    renderLoginPage();
    expect(screen.getByRole('heading', { name: 'Company Car Booking' })).toBeInTheDocument();
    expect(screen.getByText('Internal · Sign in to manage trips')).toBeInTheDocument();
  });

  it('renders email field, password field, and Sign in button', () => {
    renderLoginPage();
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('submitting unknown email shows login_no_account error', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await user.type(screen.getByLabelText(/work email/i), 'wrong@test.com');
    await user.type(screen.getByLabelText(/^password$/i), 'anypass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByText('No account found with that email.')).toBeInTheDocument();
  });

  it('submitting wrong password shows login_bad_password error and CAPTCHA widget appears', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await user.type(screen.getByLabelText(/work email/i), 'tanaka@acme.co');
    await user.type(screen.getByLabelText(/^password$/i), 'badpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.getByText('Incorrect email or password.')).toBeInTheDocument();
    expect(screen.getAllByTestId('captcha-char')).toHaveLength(5);
  });

  it('CAPTCHA input is case-insensitive: lowercase input matches uppercase code', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    // Trigger CAPTCHA with a wrong password on correct email
    await user.type(screen.getByLabelText(/work email/i), 'tanaka@acme.co');
    await user.type(screen.getByLabelText(/^password$/i), 'badpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Read the (refreshed) CAPTCHA code from the DOM
    const captchaChars = screen.getAllByTestId('captcha-char');
    const captchaCode = captchaChars.map((el) => el.textContent ?? '').join('');

    // Re-enter with correct password and the CAPTCHA code in lowercase
    await user.clear(screen.getByLabelText(/^password$/i));
    await user.type(screen.getByLabelText(/^password$/i), '1234');
    await user.type(screen.getByLabelText(/security check/i), captchaCode.toLowerCase());
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // CAPTCHA accepted: no captcha_incorrect error; credentials form transitions away
    expect(
      screen.queryByText("That code didn't match. Try the new one below.")
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/work email/i)).not.toBeInTheDocument();
  });

  it('LanguageToggle is present; switching to TH changes the Sign in button label', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TH' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'TH' }));
    expect(screen.getByRole('button', { name: 'เข้าสู่ระบบ' })).toBeInTheDocument();
  });

  it('submitting correct credentials transitions to the next step: email/password form no longer visible', async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await user.type(screen.getByLabelText(/work email/i), 'tanaka@acme.co');
    await user.type(screen.getByLabelText(/^password$/i), '1234');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(screen.queryByLabelText(/work email/i)).not.toBeInTheDocument();
  });
});

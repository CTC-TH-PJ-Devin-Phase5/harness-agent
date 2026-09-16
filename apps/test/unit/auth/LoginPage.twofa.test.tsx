import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginPage } from '@/modules/auth/pages/LoginPage';
import { LanguageProvider } from '@/modules/auth/hooks/useLang';

const FIXTURE_EMAIL = 'tanaka@acme.co';
const FIXTURE_PASSWORD = '1234';

function renderLoginPage(onAuthSuccess = vi.fn()): ReturnType<typeof render> {
  return render(
    <LanguageProvider>
      <LoginPage onAuthSuccess={onAuthSuccess} />
    </LanguageProvider>
  );
}

async function navigateToTwoFa(onAuthSuccess = vi.fn()): Promise<ReturnType<typeof vi.fn>> {
  renderLoginPage(onAuthSuccess);
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/work email/i), FIXTURE_EMAIL);
  await user.type(screen.getByLabelText(/^password$/i), FIXTURE_PASSWORD);
  await user.click(screen.getByRole('button', { name: /sign in/i }));
  return onAuthSuccess;
}

describe('LoginPage — 2FA step', () => {
  it('shows "Two-factor verification" title after correct credentials', async () => {
    await navigateToTwoFa();
    expect(screen.getByRole('heading', { name: 'Two-factor verification' })).toBeInTheDocument();
  });

  it('shows masked email (t***a@acme.co) in subtitle after correct credentials', async () => {
    await navigateToTwoFa();
    expect(screen.getByText(/t\*+a@acme\.co/)).toBeInTheDocument();
  });

  it('shows blue demo-code banner containing "Demo code:" after correct credentials', async () => {
    await navigateToTwoFa();
    const banner = screen.getByTestId('demo-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toMatch(/Demo code:/i);
  });

  it('entering wrong OTP and clicking Verify shows twofa_invalid error', async () => {
    await navigateToTwoFa();
    const user = userEvent.setup();
    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.paste('000000');
    await user.click(screen.getByRole('button', { name: /verify/i }));
    expect(screen.getByText('Incorrect code. Please try again.')).toBeInTheDocument();
  });

  it('entering correct OTP from banner and clicking Verify calls onAuthSuccess with email', async () => {
    const onAuthSuccess = vi.fn();
    await navigateToTwoFa(onAuthSuccess);
    const user = userEvent.setup();
    const banner = screen.getByTestId('demo-banner');
    const code = banner.textContent?.match(/\d{6}/)?.[0] ?? '';
    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.paste(code);
    await user.click(screen.getByRole('button', { name: /verify/i }));
    expect(onAuthSuccess).toHaveBeenCalledWith({ email: FIXTURE_EMAIL });
  });

  it('clicking Back returns to credentials step (email field is visible again)', async () => {
    await navigateToTwoFa();
    const user = userEvent.setup();
    await user.click(screen.getByText(/back to sign in/i));
    expect(screen.getByLabelText(/work email/i)).toBeInTheDocument();
  });
});

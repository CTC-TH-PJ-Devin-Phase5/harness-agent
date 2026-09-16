import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageToggle } from '@/modules/auth/components/LanguageToggle';
import { LanguageProvider } from '@/modules/auth/hooks/useLang';

function renderWithProvider(ui: React.ReactElement): ReturnType<typeof render> {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

describe('LanguageToggle', () => {
  it('renders separate EN and TH buttons', () => {
    renderWithProvider(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'EN' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'TH' })).toBeInTheDocument();
  });

  it('EN button is pressed by default', () => {
    renderWithProvider(<LanguageToggle />);
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'TH' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking TH sets lang to th', async () => {
    const user = userEvent.setup();
    renderWithProvider(<LanguageToggle />);
    await user.click(screen.getByRole('button', { name: 'TH' }));
    expect(screen.getByRole('button', { name: 'TH' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking EN after TH restores lang to en', async () => {
    const user = userEvent.setup();
    renderWithProvider(<LanguageToggle />);
    await user.click(screen.getByRole('button', { name: 'TH' }));
    await user.click(screen.getByRole('button', { name: 'EN' }));
    expect(screen.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'TH' })).toHaveAttribute('aria-pressed', 'false');
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CaptchaChallenge } from '@/modules/auth/components/CaptchaChallenge';

describe('CaptchaChallenge', () => {
  it('renders exactly 5 elements with data-testid="captcha-char"', () => {
    const onRefresh = vi.fn();
    render(<CaptchaChallenge code="AB1C2" onRefresh={onRefresh} />);
    const chars = screen.getAllByTestId('captcha-char');
    expect(chars).toHaveLength(5);
  });

  it('clicking the refresh button calls onRefresh once', async () => {
    const user = userEvent.setup();
    const onRefresh = vi.fn();
    render(<CaptchaChallenge code="XY9Z3" onRefresh={onRefresh} />);
    const refreshBtn = screen.getByRole('button');
    await user.click(refreshBtn);
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});

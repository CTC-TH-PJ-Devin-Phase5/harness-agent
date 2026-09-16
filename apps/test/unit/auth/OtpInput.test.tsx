import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OtpInput } from '@/modules/auth/components/OtpInput';

function OtpWrapper({ autoFocus = false }: { autoFocus?: boolean }): React.ReactElement {
  const [val, setVal] = React.useState('');
  return <OtpInput value={val} onChange={setVal} autoFocus={autoFocus} />;
}

describe('OtpInput', () => {
  it('renders exactly 6 input elements', () => {
    render(<OtpWrapper />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(6);
  });

  it('typing a digit in box 0 fills it and moves focus to box 1', async () => {
    const user = userEvent.setup();
    render(<OtpWrapper />);
    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.keyboard('5');
    expect(inputs[0]).toHaveValue('5');
    expect(inputs[1]).toHaveFocus();
  });

  it('Backspace on an empty box moves focus to the previous box', async () => {
    const user = userEvent.setup();
    render(<OtpWrapper />);
    const inputs = screen.getAllByRole('textbox');
    // Focus box 1 directly (simulating cursor is there after typing in box 0)
    await user.click(inputs[0]);
    await user.keyboard('5');
    // Now focus should be on box 1; press Backspace on empty box 1
    await user.keyboard('{Backspace}');
    expect(inputs[0]).toHaveFocus();
  });

  it('pasting "123456" into box 0 fills all six boxes', async () => {
    const user = userEvent.setup();
    render(<OtpWrapper />);
    const inputs = screen.getAllByRole('textbox');
    await user.click(inputs[0]);
    await user.paste('123456');
    expect(inputs[0]).toHaveValue('1');
    expect(inputs[1]).toHaveValue('2');
    expect(inputs[2]).toHaveValue('3');
    expect(inputs[3]).toHaveValue('4');
    expect(inputs[4]).toHaveValue('5');
    expect(inputs[5]).toHaveValue('6');
  });

  it('autoFocus causes the first box to receive focus on mount', () => {
    render(<OtpWrapper autoFocus={true} />);
    const inputs = screen.getAllByRole('textbox');
    expect(inputs[0]).toHaveFocus();
  });
});

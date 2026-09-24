import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderApp } from '../test/renderApp';
import { STORAGE_KEY } from '../adapters/storage';

async function openCase() {
  const user = userEvent.setup();
  renderApp('/case/01');
  await user.click(screen.getByRole('button', { name: 'Inspect the submitted work' }));
  return user;
}

describe('Case 01 in the app', () => {
  it('teaches through wrong choices, then resolves through a player-caused replay', async () => {
    const user = await openCase();

    await user.click(screen.getByRole('button', { name: /Accept submitted score/ }));
    expect(screen.getByText('Check each step against the agreed calculation before accepting the score.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Step 1/ }));
    await user.click(screen.getByRole('button', { name: 'Challenge this step' }));
    expect(screen.getByText('This step matches the agreed calculation. Inspect the remaining products.')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Step 3/ }));
    await user.click(screen.getByRole('button', { name: 'Challenge this step' }));
    expect(screen.getByText('The addition uses the displayed values correctly. Look earlier for the first incorrect value.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Resolution' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Step 2/ }));
    await user.click(screen.getByRole('button', { name: 'Challenge this step' }));
    // The replay only happens when the player asks for it.
    expect(screen.queryByText('Challenge upheld')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Replay selected step' }));

    const resolution = screen.getByRole('region', { name: 'Resolution' });
    expect(within(resolution).getByText('Challenge upheld')).toBeInTheDocument();
    expect(within(resolution).getByText(/corrected the score to 23/)).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /^Step 2 submitted: ?3 × 5 = 17 replayed: ?3 × 5 = 15$/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /^Step 3 submitted: ?8 \+ 17 = 25 replayed: ?8 \+ 15 = 23$/ })).toBeDisabled();

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(Object.keys(saved.cases)).toEqual(['01']);
    expect(saved.cases['01']).toMatchObject({ justified: 0, decisions: 1 });
    expect(saved.notebook).toEqual(['execution-mismatch']);
  });

  it('credits a justified first-attempt challenge', async () => {
    const user = await openCase();
    await user.click(screen.getByRole('radio', { name: /Step 2/ }));
    await user.click(screen.getByRole('button', { name: 'Challenge this step' }));
    await user.click(screen.getByRole('button', { name: 'Replay selected step' }));
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).cases['01']).toMatchObject({ justified: 1, decisions: 1 });
  });

  it('shows the agreed job on request', async () => {
    const user = await openCase();
    await user.click(screen.getByRole('tab', { name: 'Agreed job' }));
    expect(screen.getByText('score = w1 × x1 + w2 × x2, using exact small integers')).toBeInTheDocument();
    expect(screen.getByText(/not an LLM/)).toBeInTheDocument();
  });

  it('restores completion after a reload and shows a notice for malformed storage', async () => {
    const user = await openCase();
    await user.click(screen.getByRole('radio', { name: /Step 2/ }));
    await user.click(screen.getByRole('button', { name: 'Challenge this step' }));
    await user.click(screen.getByRole('button', { name: 'Replay selected step' }));
    const saved = localStorage.getItem(STORAGE_KEY)!;

    // Simulate a refresh on the entry page.
    document.body.innerHTML = '';
    localStorage.setItem(STORAGE_KEY, saved);
    renderApp('/');
    expect(screen.getByRole('link', { name: 'Continue investigation' })).toBeInTheDocument();

    document.body.innerHTML = '';
    localStorage.setItem(STORAGE_KEY, 'not json');
    renderApp('/');
    expect(screen.getByRole('status')).toHaveTextContent('could not be read');
    expect(screen.queryByRole('link', { name: 'Continue investigation' })).not.toBeInTheDocument();
  });
});

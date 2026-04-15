import { fireEvent, render, screen } from '@testing-library/react';

jest.mock('./World.tsx', () => () => <div data-testid="world" />);
jest.mock('./lib/auth', () => ({
  getCurrentAuthState: jest.fn().mockResolvedValue({
    ok: true,
    skipped: false,
    user: null,
    session: null,
  }),
  subscribeToAuthChanges: jest.fn(() => () => {}),
  signInWithPassword: jest.fn(),
  signUpWithPassword: jest.fn(),
  signOut: jest.fn(),
}));

import App from './App';

test('renders the SHRDLU console boot log', async () => {
  render(<App />);
  expect(await screen.findByText(/sign in or continue anonymously\./i)).toBeInTheDocument();
  expect(screen.getByTestId('world')).toBeInTheDocument();
  expect(screen.getByText(/SHRDLU system online\./i)).toBeInTheDocument();
});

test('can switch into anonymous mode', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: /use anonymously/i }));
  expect(await screen.findByText(/using the app anonymously\./i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /sign in instead/i })).toBeInTheDocument();
});

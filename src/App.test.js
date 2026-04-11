import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('./World.tsx', () => () => <div data-testid="world" />);

test('renders the SHRDLU console boot log', () => {
  render(<App />);
  expect(screen.getByTestId('world')).toBeInTheDocument();
  expect(screen.getByText(/SHRDLU system online\./i)).toBeInTheDocument();
});

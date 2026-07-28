import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

test('landing puis questionnaire via le CTA', () => {
  render(<App />);
  expect(
    screen.getByText(/La posture de tes clients/i)
  ).toBeInTheDocument();

  fireEvent.click(
    screen.getAllByRole('button', { name: /Lancer l'analyse/i })[0]
  );
  expect(screen.getByText(/Ton profil/i)).toBeInTheDocument();
});

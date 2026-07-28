import { render, screen } from '@testing-library/react';
import App from './App';

test('affiche le questionnaire au démarrage', () => {
  render(<App />);
  expect(screen.getByText(/Ton profil/i)).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: /Calculer mes plages/i })
  ).toBeInTheDocument();
});

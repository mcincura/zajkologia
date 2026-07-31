import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import ClubComingSoon from './ClubComingSoon';

describe('ClubComingSoon', () => {
  it('clearly blocks the pre-launch club without rendering purchase controls', () => {
    render(
      <MemoryRouter>
        <ClubComingSoon />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /klub pre vás práve pripravujeme/i })).toBeInTheDocument();
    expect(screen.getByText(/členstvo ani platby zatiaľ nie sú spustené/i)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /späť na hlavnú stránku/i })).toHaveAttribute('href', '/');
  });
});

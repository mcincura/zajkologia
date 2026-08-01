import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
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

  it('does not reveal a hint or unlock after four rabbit taps', () => {
    const onPreviewUnlock = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <ClubComingSoon onPreviewUnlock={onPreviewUnlock} />
      </MemoryRouter>,
    );
    const rabbit = container.querySelector('.club-coming-soon__visual img');

    for (let tap = 0; tap < 4; tap += 1) fireEvent.click(rabbit);

    expect(onPreviewUnlock).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /klub pre vás práve pripravujeme/i })).toBeInTheDocument();
  });

  it('unlocks only on the fifth rabbit tap within the short window', () => {
    const onPreviewUnlock = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <ClubComingSoon onPreviewUnlock={onPreviewUnlock} />
      </MemoryRouter>,
    );
    const rabbit = container.querySelector('.club-coming-soon__visual img');

    for (let tap = 0; tap < 5; tap += 1) fireEvent.click(rabbit);

    expect(onPreviewUnlock).toHaveBeenCalledOnce();
  });

  it('resets the tap sequence after the short window expires', () => {
    vi.useFakeTimers();
    const onPreviewUnlock = vi.fn();
    const { container } = render(
      <MemoryRouter>
        <ClubComingSoon onPreviewUnlock={onPreviewUnlock} />
      </MemoryRouter>,
    );
    const rabbit = container.querySelector('.club-coming-soon__visual img');

    for (let tap = 0; tap < 4; tap += 1) fireEvent.click(rabbit);
    vi.advanceTimersByTime(4001);
    fireEvent.click(rabbit);

    expect(onPreviewUnlock).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});

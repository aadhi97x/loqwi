import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ActivityView from './ActivityView';
import type { ActivityState } from '../../types';

const baseActivity: ActivityState = {
  data: {
    title: 'Paper Strip Fractions',
    materials: ['Paper strips', 'Pencil'],
    steps: [
      {
        instruction_text: 'Fold the paper strip into 4 equal parts.',
        instruction_speech: '',
        duration_seconds: 60,
      },
      { instruction_text: 'Shade one part.', instruction_speech: '', duration_seconds: 30 },
    ],
  },
  index: 0,
  secondsLeft: 45,
  totalSeconds: 60,
  paused: false,
};

describe('ActivityView', () => {
  it('renders nothing when there is no activity', () => {
    const { container } = render(
      <ActivityView activity={null} onPrev={() => {}} onNext={() => {}} onTogglePause={() => {}} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the title, materials, current step, and timer', () => {
    render(
      <ActivityView
        activity={baseActivity}
        onPrev={() => {}}
        onNext={() => {}}
        onTogglePause={() => {}}
      />
    );
    expect(screen.getByText('Paper Strip Fractions')).toBeInTheDocument();
    expect(screen.getByText(/Paper strips, Pencil/)).toBeInTheDocument();
    expect(screen.getAllByText('Fold the paper strip into 4 equal parts.')).not.toHaveLength(0);
    expect(screen.getByText('45s')).toBeInTheDocument();
  });

  it('shows "Pause" when running and "Resume" when paused', () => {
    const { rerender } = render(
      <ActivityView
        activity={baseActivity}
        onPrev={() => {}}
        onNext={() => {}}
        onTogglePause={() => {}}
      />
    );
    expect(screen.getByText('Pause')).toBeInTheDocument();
    rerender(
      <ActivityView
        activity={{ ...baseActivity, paused: true }}
        onPrev={() => {}}
        onNext={() => {}}
        onTogglePause={() => {}}
      />
    );
    expect(screen.getByText('Resume')).toBeInTheDocument();
  });

  it('wires the Back/Pause/Next buttons to their callbacks', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onTogglePause = vi.fn();
    render(
      <ActivityView
        activity={baseActivity}
        onPrev={onPrev}
        onNext={onNext}
        onTogglePause={onTogglePause}
      />
    );
    fireEvent.click(screen.getByText('Back'));
    fireEvent.click(screen.getByText('Pause'));
    fireEvent.click(screen.getByText('Next'));
    expect(onPrev).toHaveBeenCalledOnce();
    expect(onTogglePause).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });
});

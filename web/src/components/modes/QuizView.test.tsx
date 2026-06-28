import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuizView from './QuizView';
import type { QuizState } from '../../types';

const baseQuiz: QuizState = {
  questions: [
    {
      question_text: 'What does a fraction represent?',
      question_speech: 'What does a fraction represent?',
      options: ['A whole number', 'A part of a whole', 'A decimal', 'A percentage'],
      correct_index: 1,
      explanation_speech: 'A fraction represents a part of a whole.',
    },
  ],
  index: 0,
  score: 0,
  awaitingAnswer: true,
  revealed: null,
  finished: false,
};

describe('QuizView', () => {
  it('renders nothing when there is no quiz', () => {
    const { container } = render(<QuizView quiz={null} onSelect={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the current question and all four options', () => {
    render(<QuizView quiz={baseQuiz} onSelect={() => {}} />);
    expect(screen.getByText('What does a fraction represent?')).toBeInTheDocument();
    expect(screen.getByText('A part of a whole')).toBeInTheDocument();
    expect(screen.getByText(/Question 1 \/ 1/)).toBeInTheDocument();
  });

  it('calls onSelect with the clicked option index', () => {
    const onSelect = vi.fn();
    render(<QuizView quiz={baseQuiz} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('A part of a whole'));
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('disables options and shows the explanation once an answer is revealed', () => {
    const revealedQuiz: QuizState = {
      ...baseQuiz,
      awaitingAnswer: false,
      revealed: { selectedIndex: 1, correctIndex: 1 },
    };
    render(<QuizView quiz={revealedQuiz} onSelect={() => {}} />);
    expect(screen.getByText('A fraction represents a part of a whole.')).toBeInTheDocument();
    for (const button of screen.getAllByRole('button')) {
      expect(button).toBeDisabled();
    }
  });

  it('shows the final score screen when the quiz is finished', () => {
    const finishedQuiz: QuizState = {
      questions: [],
      index: 0,
      score: 3,
      total: 5,
      finished: true,
      revealed: null,
      awaitingAnswer: false,
    };
    render(<QuizView quiz={finishedQuiz} onSelect={() => {}} />);
    expect(screen.getByText('Quiz Complete!')).toBeInTheDocument();
    expect(screen.getByText('3 / 5')).toBeInTheDocument();
  });
});

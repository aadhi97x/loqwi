import clsx from 'clsx';

export default function CaptionBar({ text, interim }) {
  if (!text) return null;
  return (
    <div
      className={clsx(
        'border-b border-surface-700 bg-surface-900/60 px-5 py-2.5 text-center text-base',
        interim ? 'italic text-brand-300' : 'text-slate-300'
      )}
    >
      {text}
    </div>
  );
}

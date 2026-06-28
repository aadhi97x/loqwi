import Dialog from './ui/Dialog';
import { Button } from './ui/primitives';
import type { ConfirmRequest } from '../types';

interface ConfirmDialogProps {
  confirm: ConfirmRequest | null;
  onResolve: (confirmed: boolean) => void;
}

export default function ConfirmDialog({ confirm, onResolve }: ConfirmDialogProps) {
  return (
    <Dialog
      open={!!confirm}
      onClose={() => onResolve(false)}
      title="Leave current session?"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => onResolve(false)}>
            Stay
          </Button>
          <Button variant="primary" onClick={() => onResolve(true)}>
            Leave anyway
          </Button>
        </div>
      }
    >
      <p className="text-ink-700">{confirm?.message}</p>
    </Dialog>
  );
}

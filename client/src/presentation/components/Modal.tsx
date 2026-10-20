import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';

export function Modal({ titleId, onClose, busy = false, children }: {
  titleId: string; onClose(): void; busy?: boolean; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>
    <button className="close" type="button" onClick={onClose} disabled={busy} aria-label="Fechar">×</button>
    {children}
  </dialog>;
}

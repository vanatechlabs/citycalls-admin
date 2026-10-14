import type { ComponentType, ReactNode } from 'react';
import { CARD, CARD_HINT, CARD_TITLE } from './styles';

interface FormCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint?: ReactNode;
  id?: string;
  // Buttons on the right of the title (e.g. collapse / remove).
  actions?: ReactNode;
  children?: ReactNode;
}

export function FormCard({ icon: Icon, title, hint, id, actions, children }: FormCardProps) {
  return (
    <section id={id} className={CARD}>
      <div className="flex items-start justify-between gap-3">
        <h2 className={CARD_TITLE}><Icon className="h-4 w-4" /> {title}</h2>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </div>
      {hint ? <p className={CARD_HINT}>{hint}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

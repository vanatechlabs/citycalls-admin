import type { ComponentType, ReactNode } from 'react';
import { CARD, CARD_HINT, CARD_TITLE } from './styles';

interface FormCardProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  hint?: ReactNode;
  id?: string;
  children: ReactNode;
}

export function FormCard({ icon: Icon, title, hint, id, children }: FormCardProps) {
  return (
    <section id={id} className={CARD}>
      <h2 className={CARD_TITLE}><Icon className="h-4 w-4" /> {title}</h2>
      {hint ? <p className={CARD_HINT}>{hint}</p> : <div className="mb-3" />}
      {children}
    </section>
  );
}

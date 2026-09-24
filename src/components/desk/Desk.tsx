import type { ReactNode } from 'react';
import styles from './Desk.module.css';

/** A row of controls. `onPaper` switches the buttons to ink colours for pale panels. */
export function Actions({ children, onPaper = true }: { children: ReactNode; onPaper?: boolean }) {
  return <div className={`${styles.actions} ${onPaper ? styles.onPaper : ''}`}>{children}</div>;
}

export function Button({
  children,
  variant = 'secondary',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' }) {
  return (
    <button type="button" className={`${styles.button} ${styles[`button_${variant}`]}`} {...rest}>
      {children}
    </button>
  );
}

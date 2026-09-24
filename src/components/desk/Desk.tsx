import type { ReactNode } from 'react';
import styles from './Desk.module.css';

/** Workspace + finding panel. On narrow screens the finding follows the decision controls. */
export function Desk({ workspace, finding }: { workspace: ReactNode; finding: ReactNode }) {
  return (
    <div className={styles.desk}>
      <div className={styles.workspace}>{workspace}</div>
      <aside className={styles.finding} aria-label="Finding">
        {finding}
      </aside>
    </div>
  );
}

export function Paper({ children, title, as: Tag = 'section' }: { children: ReactNode; title?: string; as?: 'section' | 'div' }) {
  return (
    <Tag className={styles.paper}>
      {title && <h2 className={styles.paperTitle}>{title}</h2>}
      {children}
    </Tag>
  );
}

export function Actions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
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

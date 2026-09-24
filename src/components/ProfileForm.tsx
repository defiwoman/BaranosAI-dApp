import { useId, useState, type FormEvent } from 'react';
import { validateProfile, NAME_MAX_LENGTH, type Profile } from '../domain/profile';
import styles from './ProfileForm.module.css';

interface Props {
  initial?: Profile | null;
  submitLabel: string;
  onSave: (profile: Profile) => void;
  onCancel?: () => void;
}

/** Name for the certificate (required) and an optional X handle. No email, password or wallet. */
export function ProfileForm({ initial, submitLabel, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [xHandle, setXHandle] = useState(initial?.xHandle ? `@${initial.xHandle}` : '');
  const [errors, setErrors] = useState<{ name?: string; xHandle?: string }>({});
  const id = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const result = validateProfile(name, xHandle);
    setErrors(result.errors);
    if (result.profile) {
      onSave(result.profile);
    } else {
      document.getElementById(result.errors.name ? `${id}-name` : `${id}-x`)?.focus();
    }
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div className={styles.field}>
        <label htmlFor={`${id}-name`}>Name on your certificate</label>
        <p id={`${id}-name-help`} className={styles.help}>
          A display name or nickname is fine; it doesn’t have to be your real name.
        </p>
        <input
          id={`${id}-name`}
          type="text"
          autoComplete="nickname"
          value={name}
          maxLength={NAME_MAX_LENGTH * 4}
          required
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={`${id}-name-help${errors.name ? ` ${id}-name-error` : ''}`}
          onChange={(e) => setName(e.target.value)}
        />
        {errors.name && (
          <p id={`${id}-name-error`} className={styles.error}>
            {errors.name}
          </p>
        )}
      </div>
      <div className={styles.field}>
        <label htmlFor={`${id}-x`}>
          X handle <span className={styles.optional}>(optional)</span>
        </label>
        <input
          id={`${id}-x`}
          type="text"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="@yourhandle"
          value={xHandle}
          aria-invalid={errors.xHandle ? true : undefined}
          aria-describedby={errors.xHandle ? `${id}-x-error` : undefined}
          onChange={(e) => setXHandle(e.target.value)}
        />
        {errors.xHandle && (
          <p id={`${id}-x-error`} className={styles.error}>
            {errors.xHandle}
          </p>
        )}
      </div>
      <p className={styles.storage}>Your name and progress are saved in this browser so you can return to your quest.</p>
      <div className={styles.actions}>
        <button type="submit" className={styles.primary}>
          {submitLabel}
        </button>
        {onCancel && (
          <button type="button" className={styles.secondary} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

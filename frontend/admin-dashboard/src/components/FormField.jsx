export default function FormField({ label, name, error, hint, children }) {
  return (
    <label className="form-field" htmlFor={name}>
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error" role="alert">{error}</span>}
      {!error && hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Flash({
  error,
  saved,
  info,
}: {
  error?: string;
  saved?: string;
  info?: string;
}) {
  if (error) {
    return (
      <div role="alert" className="alert alert-error text-sm py-2">
        {error}
      </div>
    );
  }
  if (info) {
    return (
      <div role="alert" className="alert alert-success text-sm py-2">
        {info}
      </div>
    );
  }
  if (saved) {
    return (
      <div role="alert" className="alert alert-success text-sm py-2">
        Saved.
      </div>
    );
  }
  return null;
}

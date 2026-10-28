export default function Flash({ error, notice }: { error?: string; notice?: string }) {
  return (
    <>
      {error && (
        <p role="alert" className="flash flash-error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="flash flash-ok">
          {notice}
        </p>
      )}
    </>
  );
}

"use client";
import { useFormStatus } from "react-dom";

// Bouton d'envoi qui demande une confirmation et se désactive pendant l'envoi.
export default function ConfirmSubmit({
  children,
  message,
  className,
}: {
  children: React.ReactNode;
  message?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className}
      onClick={(e) => {
        if (message && !window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? "Patientez…" : children}
    </button>
  );
}

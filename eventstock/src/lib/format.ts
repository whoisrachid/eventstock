// Fonctions d'affichage partagées (montants, dates, statuts, erreurs).

export function fcfa(amount: number | null | undefined): string {
  return `${Number(amount ?? 0).toLocaleString("fr-FR")} FCFA`;
}

// Ex. "jeu. 29 oct., 08:00" (l'année n'est ajoutée que si ce n'est pas l'année en cours).
export function dateTime(value: string): string {
  const d = new Date(value);
  const sameYear = d.getUTCFullYear() === new Date().getUTCFullYear();
  return d.toLocaleString("fr-FR", {
    timeZone: "Africa/Abidjan",
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmée",
  out: "Matériel sorti",
  completed: "Terminée",
  cancelled: "Annulée",
};

export const PAYMENT_METHODS: Record<string, string> = {
  cash: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
  mtn_momo: "MTN MoMo",
  bank_transfer: "Virement",
  other: "Autre",
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

// Traduit les messages techniques renvoyés par la base en messages compréhensibles.
const ERRORS: [RegExp, string][] = [
  [/Not authorized/i, "Vous n'avez pas les droits pour cette action."],
  [/Not authenticated/i, "Votre session a expiré, reconnectez-vous."],
  [
    /Insufficient stock.*available at peak: (-?\d+)/i,
    "Stock insuffisant sur cette période (disponible : $1).",
  ],
  [/Invalid date range/i, "La date de fin doit être après la date de début."],
  [/Date outside allowed range/i, "Les dates doivent être comprises entre hier et dans 2 ans."],
  [/Invalid or duplicate equipment lines/i, "Le même matériel apparaît deux fois."],
  [/Invalid customer/i, "Client introuvable."],
  [/Subscription inactive/i, "Votre abonnement a expiré."],
  [/Reservation not found/i, "Réservation introuvable."],
  [
    /Only confirmed reservations can be cancelled/i,
    "Seule une réservation confirmée peut être annulée.",
  ],
  [
    /Stock below commitments.*\(peak: (\d+)\)/i,
    "Impossible : $1 unités sont déjà réservées sur une même période à venir.",
  ],
  [
    /Payment exceeds balance.*\(balance: (\d+)\)/i,
    "Le montant dépasse le reste à payer ($1 FCFA).",
  ],
  [/Reservation cancelled/i, "Cette réservation est annulée."],
  [/Payment not found/i, "Paiement introuvable."],
  [/Payment already voided/i, "Ce paiement est déjà annulé."],
  [/Invalid reference/i, "Référence trop longue (100 caractères maximum)."],
  [/Invalid location/i, "Lieu trop long (200 caractères maximum)."],
  [/Invalid name/i, "Nom invalide (2 caractères minimum)."],
  [/Invalid quantity/i, "Quantité invalide."],
  [/Equipment not found/i, "Matériel introuvable."],
  [/Invalid amount/i, "Montant invalide."],
  [/Invalid payment method/i, "Moyen de paiement invalide."],
  [/Discount exceeds total/i, "La remise dépasse le montant total."],
  [/Invalid billed days/i, "Nombre de jours facturés invalide."],
  [/Invalid status transition/i, "Ce changement de statut n'est pas possible."],
  [/Invalid login credentials/i, "Email ou mot de passe incorrect."],
  [/Email not confirmed/i, "Confirmez d'abord votre adresse email."],
  [/User already registered/i, "Un compte existe déjà avec cet email."],
  [/Password should be at least/i, "Le mot de passe doit contenir au moins 8 caractères."],
  [/rate limit/i, "Trop de tentatives, réessayez dans quelques minutes."],
];

export function friendlyError(message: string): string {
  for (const [pattern, text] of ERRORS) {
    const m = message.match(pattern);
    if (m) return text.replace("$1", m[1] ?? "");
  }
  return "Une erreur est survenue. Réessayez ou contactez le support.";
}

# EventStock

Application **Next.js 15 / TypeScript / Supabase** pour les loueurs de matériel événementiel en Côte d'Ivoire.

> **À lire en premier : [A_FAIRE.md](A_FAIRE.md)**, la liste de ce qu'il te reste à faire (réglages Supabase, tests, fonctionnalités).

## Ce que fait l'application

- Inscription, connexion, confirmation par email, **mot de passe oublié**
- Création de l'entreprise (onboarding), isolation complète entre entreprises (RLS)
- **Matériel** : ajout, **modification du nom, du prix et du stock** (le stock ne peut pas descendre sous ce qui est déjà promis aux clients)
- **Clients** : ajout, appel en un clic depuis le téléphone
- **Réservations** : plusieurs matériels par réservation, lieu de l'événement, contrôle anti‑surbooking verrouillé en base, **annulation**
- **Montant** : jours facturés (calcul automatique ou saisie manuelle), transport, remise, total calculé par la base
- **Paiements** : espèces, Wave, Orange Money, MTN MoMo, virement ; acomptes multiples, reste à payer, annulation d'un paiement saisi par erreur (réservée au propriétaire, le paiement reste visible barré)
- **Tableau de bord** : réservations des 7 prochains jours et total restant à encaisser
- Interface pensée pour le téléphone (barre d'onglets en bas, listes lisibles)

## Rôles

| Rôle | Peut faire |
| --- | --- |
| owner (propriétaire) | tout, y compris annuler un paiement |
| manager | matériel, réservations, annulations, encaissements |
| staff | consulter, ajouter des clients |

## Installation (nouveau projet)

1. Node.js 20+, puis `npm install`.
2. Copier `.env.example` en `.env.local` et renseigner les 3 variables.
3. Dans Supabase > SQL Editor, exécuter **dans l'ordre**, une seule fois chacun :
   1. `supabase/migrations/202610270001_initial.sql`
   2. `supabase/migrations/202610280001_stock_adjustment.sql`
   3. `supabase/migrations/202610280002_pricing.sql`
   4. `supabase/migrations/202610280003_payments.sql`
4. `npm run dev`, ouvrir http://localhost:3000.

## Mise à jour d'une base existante

Si tu as déjà exécuté `202610270001_initial.sql`, exécute seulement les 3 fichiers suivants, dans l'ordre. Les réservations déjà créées sont reprises automatiquement (jours facturés et total recalculés, sans transport ni remise).

## Réglages Supabase indispensables

**Authentication > URL Configuration**
- Site URL : l'adresse de ton site (ex. `https://eventstock.netlify.app`)
- Redirect URLs : ajouter `https://TON-SITE/auth/confirm` (et `http://localhost:3000/auth/confirm` pour le développement)

**Authentication > Email Templates** (recommandé : le lien fonctionne même si l'email est ouvert sur un autre appareil)
- *Confirm signup* : remplacer le lien par
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding`
- *Reset Password* : remplacer le lien par
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`

Sans ce changement, les liens par défaut fonctionnent aussi, mais seulement dans le navigateur où la demande a été faite.

**Emails** : le service d'envoi intégré de Supabase est très limité (quelques emails par heure). Pour la production, configurer un SMTP (Authentication > SMTP Settings), par exemple Brevo ou Resend.

## Déploiement Netlify

Ajouter les variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `NEXT_PUBLIC_SITE_URL` dans les paramètres d'environnement. Ne jamais utiliser la clé `service_role` dans le frontend.

## Commandes

```bash
npm run dev        # développement
npm run typecheck  # vérification des types
npm run build      # build de production
npm run format     # mise en forme du code
```

## Tests de la base

`supabase/tests/` contient des tests SQL (annulation, stock, montants, paiements, isolation entre entreprises). Ils s'exécutent sur un **Postgres local vide**, jamais sur la production :

```bash
createdb test_eventstock
PSQL="psql -d test_eventstock" ./supabase/tests/run.sh
```

## Choix techniques importants

- Toute écriture sensible passe par des fonctions SQL (`create_confirmed_reservation`, `cancel_reservation`, `update_equipment`, `record_payment`, `void_payment`) qui vérifient le rôle et verrouillent les lignes concernées. Ne pas ajouter de règles RLS INSERT/UPDATE sur `reservations`, `reservation_items`, `payments` ou `equipment` (mise à jour).
- Anti‑surbooking : on calcule le **pic** d'utilisation simultanée sur la période, pas la somme des réservations qui se chevauchent. Testé avec deux sessions concurrentes : la seconde attend, puis est refusée.
- Prix figé : le prix par jour est copié dans chaque ligne au moment de la confirmation ; changer un prix n'affecte pas les réservations existantes.
- Heures : les dates saisies sont lues à l'heure d'Abidjan (UTC+0, sans changement d'heure).
- Jours facturés : toute tranche de 24 h entamée compte pour un jour (49 h = 3 jours), modifiable à la main.

## Reste à faire avant un usage commercial

- Écrans « matériel sorti » et « retour » (statuts `out` et `completed` déjà prévus en base)
- Modification d'une réservation confirmée (aujourd'hui : annuler puis recréer)
- Devis et factures en PDF, envoi par WhatsApp
- Invitation des membres de l'équipe et gestion des rôles depuis l'interface
- Abonnements payants (l'essai de 14 jours expire sans moyen de payer pour l'instant)
- Sauvegardes, limitation des abus, tests automatisés de l'interface

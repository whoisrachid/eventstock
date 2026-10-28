# Ce qu'il te reste à faire

Coche chaque case au fur et à mesure. Les parties 1 à 4 sont à faire **avant de montrer l'application à un client**. La partie 5 liste les fonctionnalités qui restent à développer.

---

## 1. Mettre à jour la base Supabase (10 minutes)

Supabase > **SQL Editor** > New query. Copie, colle et exécute chaque fichier **un par un, dans cet ordre**. Attends le message « Success » avant de passer au suivant.

1. [ ] Si ta base est neuve : `supabase/migrations/202610270001_initial.sql`
   (si tu l'as déjà exécuté avant, **ne le relance pas**, passe directement au 2)
2. [ ] `supabase/migrations/202610280001_stock_adjustment.sql`
3. [ ] `supabase/migrations/202610280002_pricing.sql`
4. [ ] `supabase/migrations/202610280003_payments.sql`

Chaque fichier ne s'exécute **qu'une seule fois**. Une erreur du type « already exists » veut dire qu'il a déjà été exécuté : ne recommence pas.

Vérification : dans **Table Editor**, la table `reservations` a maintenant les colonnes `total`, `transport_fee` et `discount`, et une vue `reservation_balances` apparaît.

## 2. Régler l'authentification dans Supabase (10 minutes)

**Authentication > URL Configuration**

1. [ ] **Site URL** : l'adresse de ton site, par exemple `https://eventstock.netlify.app`
2. [ ] **Redirect URLs**, ajouter ces deux adresses :
   `https://TON-SITE/auth/confirm`
   `http://localhost:3000/auth/confirm`

**Authentication > Email Templates** (pour que les liens marchent même si l'email est ouvert sur un autre téléphone)

3. [ ] Modèle **Confirm signup** : remplace le lien `{{ .ConfirmationURL }}` par
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/onboarding`
4. [ ] Modèle **Reset Password** : remplace le lien `{{ .ConfirmationURL }}` par
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
5. [ ] Tant que tu y es, traduis le texte des emails en français (ils sont en anglais par défaut).

**Authentication > SMTP Settings** (indispensable avant d'avoir de vrais clients)

6. [ ] Brancher un service d'envoi d'emails (Brevo, Resend…). Sans ça, Supabase n'envoie que quelques emails par heure et les inscriptions bloqueront.

## 3. Variables d'environnement (5 minutes)

1. [ ] Sur ton ordinateur : copie `.env.example` en `.env.local` et remplis les 3 lignes
   (`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` se trouvent dans Supabase > Project Settings > API)
2. [ ] Sur Netlify > Site configuration > Environment variables : ajoute les mêmes 3 variables, avec `NEXT_PUBLIC_SITE_URL` = l'adresse de ton site en ligne (sans `/` à la fin)
3. [ ] Redéploie le site sur Netlify après avoir ajouté les variables

Ne mets **jamais** la clé `service_role` dans ces variables.

## 4. Tester toi‑même l'application (30 minutes)

Je n'ai pas pu brancher l'interface sur un vrai Supabase depuis mon environnement. La base est testée, mais ces parcours doivent être vérifiés chez toi, une fois en local (`npm install` puis `npm run dev`) et une fois sur le site en ligne, **depuis ton téléphone**.

**Compte**

1. [ ] Créer un compte, recevoir l'email, cliquer sur le lien : tu arrives sur « Votre entreprise »
2. [ ] Créer l'entreprise : son nom apparaît en haut de l'écran
3. [ ] Se déconnecter, puis se reconnecter
4. [ ] « Mot de passe oublié ? » : recevoir l'email, choisir un nouveau mot de passe, se connecter avec
5. [ ] Ouvrir le lien de l'email sur un **autre** appareil que celui de la demande : ça doit marcher aussi (si tu as fait l'étape 2.3 et 2.4)

**Matériel et clients**

6. [ ] Ajouter 3 matériels (ex. 10 bâches, 200 chaises, 2 sonos)
7. [ ] Modifier le prix d'un matériel
8. [ ] Ajouter 2 clients, puis toucher un numéro de téléphone : l'appel se lance

**Réservations**

9. [ ] Créer une réservation avec 2 matériels, du transport et une remise : l'estimation affichée correspond au total de la fiche
10. [ ] Réserver les 2 sonos sur un week‑end, puis essayer de réserver 1 sono de plus sur les mêmes jours : **refus** avec « Stock insuffisant »
11. [ ] Réserver 1 sono le lundi suivant : **accepté**
12. [ ] Essayer de passer le stock de sonos à 1 : **refus** (2 sont déjà réservées)
13. [ ] Annuler une réservation : le matériel redevient disponible

**Paiements**

14. [ ] Enregistrer un acompte Wave avec une référence, puis le solde en espèces : « Soldé » apparaît dans la liste
15. [ ] Essayer d'encaisser plus que le reste à payer : **refus**
16. [ ] Annuler un paiement : il reste visible, barré, et le reste à payer remonte
17. [ ] Le tableau de bord affiche le bon total « Reste à encaisser »

**Isolation entre entreprises**

18. [ ] Créer un deuxième compte avec une autre adresse email et une autre entreprise : il ne voit **rien** de la première

Si un de ces tests échoue, note le numéro et le message affiché, et envoie‑les moi.

---

## 5. Fonctionnalités qui restent à développer

Classées de la plus urgente à la moins urgente pour un usage commercial.

**Indispensable avant de vendre l'abonnement**

1. [ ] **Sortie et retour du matériel** : boutons « Matériel sorti » et « Matériel rendu » sur la fiche (les statuts existent déjà dans la base). Un retour anticipé libère le stock plus tôt.
2. [ ] **Paiement de l'abonnement** : l'essai gratuit s'arrête au bout de 14 jours et, pour l'instant, rien ne permet de payer. Après ce délai, plus aucune réservation n'est possible. À brancher sur un paiement mobile (CinetPay, PayDunya, Wave Business…).
3. [ ] **Invitation de l'équipe** : ajouter un employé à son entreprise et choisir son rôle (propriétaire, gérant, employé), depuis l'interface.
4. [ ] **Modifier une réservation confirmée** (dates, quantités) : aujourd'hui il faut annuler puis recréer.

**Très utile pour les loueurs**

5. [ ] **Devis et facture en PDF**, avec le logo de l'entreprise
6. [ ] **Envoi par WhatsApp** du devis, de la confirmation et des rappels de paiement
7. [ ] **Calendrier de disponibilité** : voir d'un coup d'œil ce qui est libre sur une date
8. [ ] **Recherche et filtres** dans les réservations (par client, par date, « non soldées »)
9. [ ] **Fiche client** avec l'historique de ses réservations et ce qu'il doit
10. [ ] **Paramètres de l'entreprise** : nom, téléphone, logo, conditions de location
11. [ ] **Caution** (dépôt de garantie) et suivi du matériel abîmé ou perdu

**Sécurité et fiabilité**

12. [ ] Activer les **sauvegardes** automatiques dans Supabase (offre payante) ou exporter la base régulièrement
13. [ ] **Limiter les abus** : protection contre les inscriptions en masse (captcha dans Supabase > Authentication > Attack Protection)
14. [ ] **Tests automatiques de l'interface** pour vérifier les parcours de la partie 4 à chaque modification
15. [ ] Une page **Conditions d'utilisation** et **Politique de confidentialité**

---

Pour la suite, dis‑moi simplement « on attaque le point 5.1 » (ou un autre numéro), et je le développe de la même manière, étape par étape.

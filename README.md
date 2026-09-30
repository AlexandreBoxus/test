# Réseau Associatif de Walhain

Prototype fonctionnel du portail numérique des associations de la **Commune de Walhain**. Il couvre les villages de Walhain, Tourinnes-Saint-Lambert, Perbais, Nil-Saint-Vincent et Nil-Pierreux, et a été pensé pour la Commune, les associations, la CLDR et la Fondation Rurale de Wallonie.

Application web responsive, entièrement en français, sans étape de compilation : HTML, CSS et JavaScript natifs.

## Lancer l'application

```bash
npm start              # serveur local sur http://localhost:8080
# ou
python3 -m http.server 8080
```

Ouvrez ensuite `http://localhost:8080`. On peut aussi publier le dossier tel quel sur n'importe quel hébergement statique (GitHub Pages, serveur communal…).

**Accès administrateur (prototype)** : `admin` / `Walhain2026!`. Le mot de passe doit être changé dès la première connexion.

```bash
npm test               # tests unitaires : récurrences, hachage, échappement
```

## Fonctionnalités

### Module 1 : Répertoire des associations
- Cartes avec visuel, nom, pictogramme de thématique, description courte, villages et bouton « Voir la fiche ».
- Barre de recherche plein texte, qui ignore les accents. Filtres par village, thématique, public cible et mot-clé. L'état des filtres est conservé dans l'URL, ce qui permet de partager une recherche.
- Fiche détaillée comprenant :
  - la présentation, l'historique, le public cible et les mots-clés ;
  - le contact : personne, e-mail, téléphone, site et réseaux sociaux ;
  - les activités récurrentes (fréquence, jour, heure, lieu) et les villages sous forme de badges ;
  - les prochains événements de l'association ;
  - les partenaires et un « appel à collaboration », pour favoriser les liens entre acteurs locaux.
- Bouton **« Contacter cette association »** : formulaire Nom, Prénom, E-mail, Message, avec consentement RGPD et protection anti-spam.
- **Export PDF** de la fiche, via une mise en page imprimable (« Enregistrer au format PDF »).
- **Partage** sur Facebook, sur Instagram (partage natif sur mobile, sinon copie du lien) et copie du lien.
- Formulaires **Ajouter une association** et **Modifier une association** avec tous les champs demandés : photo redimensionnée automatiquement, activités récurrentes dynamiques et position sur la carte.
- 14 thématiques avec pictogrammes : Culture & Patrimoine, Nature & Environnement, Jeunesse, Sport, Aînés, Solidarité & Social, Santé, Éducation & Formation, Loisirs, Animation villageoise, Artisanat, Économie locale, Mobilité, Autres. Elles sont définies dans `assets/js/config.js` et peuvent être scindées ou renommées facilement.

### Module 2 : Agenda communal associatif
- Trois affichages : **calendrier mensuel**, **calendrier hebdomadaire** et **liste chronologique**.
- Filtres : date, association, village, catégorie, gratuit ou payant.
- Fiche activité : affiche, date, horaires, lieu, village, prix, places, organisateur, coordonnées, lien d'inscription, bouton **« Contacter l'organisateur »**, ajout à l'agenda personnel (.ics) et partage.
- Formulaire collaboratif d'ajout d'événement, avec **récurrence** : unique, hebdomadaire, mensuelle (même date ou même jour de semaine, par exemple « 2e vendredi ») ou annuelle. On peut fixer un intervalle et une date de fin. Les **occurrences sont générées automatiquement** et le formulaire en affiche un aperçu en direct.
- Les événements sur plusieurs jours sont pris en charge (exemple : une exposition du 10 au 18 octobre).

### Espace administration
- Connexion avec mot de passe haché (SHA-256 salé). La session expire après 60 min d'inactivité et le compte est verrouillé temporairement après 5 échecs.
- **Validation** des nouvelles associations, des propositions de modification (avec la liste des champs modifiés) et des événements.
- **Gestion des contenus** : modification et suppression, export CSV.
- **Messages** transmis via les formulaires de contact.
- **Newsletter** : abonnés, aperçu généré automatiquement à partir des événements à venir, envoi automatique hebdomadaire (jour et période paramétrables) et historique.
- **Utilisateurs** : rôles administrateur et modérateur.
- **Statistiques d'usage** anonymes : visites quotidiennes, fiches les plus consultées, répartition par thématique et par village, recherches fréquentes, partages et exports. S'y ajoute un journal d'activité.
- **Données & RGPD** : sauvegarde et restauration JSON, recherche et effacement des données d'une personne, réinitialisation.

### Compléments
- **Carte interactive** (Leaflet + OpenStreetMap) avec les associations, filtrables, et les villages.
- **Conformité RGPD** : bandeau d'information (aucun traceur), politique de confidentialité, cases de consentement, désinscription en un clic et purge automatique des messages après 12 mois.
- **Accessibilité** : navigation au clavier, lien d'évitement, modales qui gardent le focus, contrastes, libellés ARIA, respect de `prefers-reduced-motion`.
- **Version mobile optimisée** : menu repliable, calendrier compact avec pastilles et liste, tableaux en cartes.

## Données pré-remplies

Les **24 associations** proviennent du document « Retranscription des fiches individuelles ». Les descriptions, activités, partenariats et besoins y sont repris et reformulés. Les points suivants sont à compléter ou à vérifier :

- **Coordonnées** (personne de contact, e-mail, téléphone, site, réseaux) : elles ne figurent pas dans le document et sont donc vides. En attendant, les messages de contact sont marqués « à relayer » dans l'administration.
- **Événements de démonstration** : ils sont construits à partir des « agendas » des fiches. Ceux dont la date ou l'horaire a été estimé portent le badge **« à confirmer »**. Seul le souper « Pâtes » du Jumelage (12/09/2026) a une date précise dans le document.
- **Villages et positions sur la carte** : quand le document ne précise pas le village (Foire aux Potirons, TWIST, Le Fenil…), c'est « Walhain » qui est indiqué. Les marqueurs sont placés au centre du village tant qu'une adresse n'est pas saisie.

## Architecture

```
index.html              coque de l'application (en-tête, pied de page, scripts)
assets/css/styles.css   design system (couleurs vert / bleu / beige), responsive
assets/js/
  utils.js              dates, récurrences, SHA-256, images, CSV
  icons.js              pictogrammes (extraits de Lucide, licence ISC)
  config.js             villages, thématiques, publics cibles
  seed.js               données initiales (fiches individuelles)
  store.js              couche de données (locale ou Firebase) : CRUD, validation, stats, session
  ui.js                 composants : modales, notifications, contact, partage, PDF, .ics
  directory.js          module Répertoire
  agenda.js             module Agenda
  forms.js              formulaires association / événement
  map.js                carte interactive
  admin.js              espace administration
  pages.js              accueil, confidentialité, pages annexes
  app.js                routeur (#/…) et initialisation
  firebase-config.js    configuration Firebase (null = mode démonstration)
  remote.js             connecteur Firebase (Firestore temps réel + Authentication)
vendor/leaflet/         Leaflet 1.9.4 (licence BSD-2), embarqué pour fonctionner hors CDN
vendor/firebase/        SDK Firebase 12 (Apache-2.0), chargé uniquement en mode base partagée
firestore.rules         règles de sécurité de la base
firebase.json           configuration Firebase CLI (règles, émulateurs, hébergement optionnel)
docs/FIREBASE.md        guide de mise en service
tests/                  tests unitaires (node --test)
```

## Deux modes de fonctionnement

| | Mode démonstration (par défaut) | Mode base partagée (Firebase) |
|---|---|---|
| Activation | `WA.FIREBASE_CONFIG = null` | Configuration Firebase renseignée dans `assets/js/firebase-config.js` |
| Données | Dans le navigateur de chaque visiteur | Partagées par tous, mises à jour en temps réel |
| Demande d'une association | Visible seulement sur le même navigateur | Arrive dans **Admin → Validation**, sur n'importe quel ordinateur |
| Connexion admin | `admin` / `Walhain2026!` | E-mail et mot de passe (Firebase Authentication), avec réinitialisation par e-mail |
| Sécurité | Démonstration | Règles côté serveur (`firestore.rules`) |

**Mise en service réelle : suivez le guide [docs/FIREBASE.md](docs/FIREBASE.md)** (environ 20 minutes, offre gratuite).

Le passage en mode base partagée a été testé avec les émulateurs Firebase et plusieurs navigateurs simultanés :
- demande d'adhésion, validation et publication ;
- proposition de modification d'une fiche ;
- messages et newsletter ;
- création d'un modérateur ;
- blocage des écritures et lectures non autorisées.

## Limites restantes

1. **E-mails** : les messages de contact et la newsletter sont centralisés dans l'admin mais pas encore envoyés automatiquement. Il faudrait ajouter l'extension Firebase *Trigger Email* (forfait Blaze) ou un service comme Brevo ou Mailjet.
2. **Images** : elles sont stockées dans les fiches, compressées à 900 px. Pour un usage intensif, prévoir Firebase Storage.
3. **RGPD** : compléter les coordonnées du DPO dans la politique de confidentialité et inscrire les traitements au registre.
4. **Géocodage** des adresses, pour positionner précisément les associations sur la carte.

# Héberger le portail

Le portail se compose de deux parties :

1. **Le site lui-même** : un dossier de fichiers statiques (HTML, CSS, JavaScript, images). Il ne demande ni base de données locale, ni PHP, ni Node.js sur le serveur.
2. **La base de données partagée**, hébergée par Firebase dans la région `europe-west1` (Belgique). Sa mise en place est décrite dans [FIREBASE.md](FIREBASE.md).

La première partie peut être hébergée où vous le souhaitez. Trois possibilités :

## Option 1 : sur le serveur de la Commune (hébergement interne)

Le service informatique ou le prestataire web de la Commune :

1. copie le contenu du dépôt sur un serveur web (Apache, Nginx, IIS…), par exemple à l'adresse `https://associations.walhain.be`. Les dossiers `docs/` et `tests/` sont inutiles en production ;
2. active le **HTTPS**, indispensable pour l'application installable et la connexion des administrateurs ;
3. ajoute le domaine dans Firebase : **Authentication → Paramètres → Domaines autorisés**.

Aucune configuration serveur particulière n'est nécessaire. Il n'y a pas de réécriture d'URL, car les pages du portail utilisent des adresses en `#/…`.

## Option 2 : Firebase Hosting (le plus simple si Firebase est déjà utilisé)

Sur un ordinateur où Node.js est installé :

```bash
npx firebase-tools login
npx firebase-tools use --add          # choisir le projet reseau-associatif-walhain
npx firebase-tools deploy --only hosting,firestore:rules
```

Le site est publié à l'adresse `https://reseau-associatif-walhain.web.app`. Un domaine personnalisé comme `associations.walhain.be` peut ensuite être ajouté dans la console : **Hosting → Ajouter un domaine personnalisé**.

## Option 3 : GitHub Pages

Dans le dépôt, ouvrez **Settings → Pages → Deploy from a branch**, puis choisissez la branche et le dossier `/ (root)`.

## Mettre à jour le site

Après une modification du code :
- **option 1** : recopiez les fichiers modifiés sur le serveur ;
- **option 2** : relancez `deploy` ;
- **option 3** : la mise à jour est automatique.

Les visiteurs qui ont installé l'appli reçoivent la nouvelle version à leur prochaine ouverture avec connexion. Le service worker privilégie toujours la version en ligne.

## Intégration dans Google Sites

**Insérer → Intégrer → Par URL**, puis collez l'adresse du portail. Ajoutez aussi un bouton « Ouvrir le portail », plus confortable sur mobile.

# Mettre le portail en service avec Firebase

Avec Firebase, les données sont **partagées** entre tous les visiteurs. Une association qui remplit « Ajouter une association » apparaît dans l'onglet **Validation** de l'admin, sur n'importe quel ordinateur. Une fois validée, elle est visible par tout le monde.

Compter environ **20 minutes**. L'offre gratuite de Firebase (« Spark ») suffit largement pour un portail communal, et aucune carte bancaire n'est demandée.

---

## 1. Créer le projet

1. Allez sur <https://console.firebase.google.com> avec un compte Google, de préférence un compte de la Commune plutôt qu'un compte personnel.
2. Cliquez sur **Créer un projet** (ou « Ajouter un projet »).
3. Nom : `reseau-associatif-walhain`, puis **Continuer**.
4. Google Analytics : **désactivez-le** (inutile, et plus simple pour le RGPD), puis **Créer le projet**.

## 2. Activer la connexion des administrateurs

1. Menu de gauche : **Créer** (Build) → **Authentication** → **Commencer**.
2. Onglet **Mode de connexion** (Sign-in method) → **Adresse e-mail/Mot de passe** → activez le premier interrupteur → **Enregistrer**.
3. Onglet **Utilisateurs** → **Ajouter un utilisateur** : saisissez l'e-mail et le mot de passe du **premier administrateur**, par exemple l'agent communal responsable.
4. Onglet **Paramètres** → **Domaines autorisés** → **Ajouter un domaine** : ajoutez l'adresse du site, par exemple `alexandreboxus.github.io`.

## 3. Créer la base de données

1. Menu **Créer** → **Firestore Database** → **Créer une base de données**.
2. Emplacement : **`europe-west1` (Belgique)**. Les données restent ainsi dans l'Union européenne, ce qui est préférable pour le RGPD. Ce choix est définitif.
3. Choisissez **Démarrer en mode production** → **Créer**.

## 4. Installer les règles de sécurité

C'est l'étape qui protège les données : sans elle, le site n'affichera rien.

1. Dans **Firestore Database**, ouvrez l'onglet **Règles**.
2. Effacez tout le contenu et collez celui du fichier [`firestore.rules`](../firestore.rules) du dépôt.
3. Cliquez sur **Publier**.

Ces règles garantissent que :
- le public ne voit que les contenus **publiés** ;
- le public peut seulement **proposer** des associations et des événements, envoyer un message ou s'inscrire à la newsletter ;
- les messages, les abonnés et les statistiques ne sont lisibles que par l'administration ;
- seuls les administrateurs gèrent les comptes.

## 5. Relier le site au projet

1. Cliquez sur la roue dentée ⚙ en haut à gauche → **Paramètres du projet**.
2. En bas, rubrique **Vos applications** : cliquez sur l'icône **Web** `</>`.
3. Nom : `Portail`. Ne cochez **pas** Firebase Hosting. Puis **Enregistrer l'application**.
4. Firebase affiche un bloc `const firebaseConfig = { apiKey: …, authDomain: …, … }`.
5. Recopiez ces valeurs dans le fichier `assets/js/firebase-config.js`, à la place de `null` (un exemple figure dans le fichier). Vous pouvez aussi me les transmettre et je fais la modification.

Ces valeurs ne sont pas secrètes : c'est normal qu'elles soient visibles dans le code du site. La sécurité repose sur les règles de l'étape 4.

## 6. Donner les droits au premier administrateur

1. Ouvrez le site → **Admin** → connectez-vous avec l'e-mail et le mot de passe créés à l'étape 2.
2. Le site indique que le compte n'a pas encore les droits et affiche un **identifiant** (UID). Cliquez sur **Copier**.
3. Dans la console Firebase → **Firestore Database** → **Données** → **Commencer une collection** :
   - ID de la collection : `admins` ;
   - ID du document : collez l'identifiant copié ;
   - ajoutez trois champs, tous de type *string* :
     - `role` = `admin` ;
     - `email` = l'adresse e-mail ;
     - `name` = le nom de la personne.
   - **Enregistrer**.
4. Rechargez le site : l'espace d'administration s'ouvre.

Les administrateurs et modérateurs suivants s'ajoutent directement depuis l'onglet **Utilisateurs** de l'admin, sans repasser par la console.

## 7. Charger les associations de départ

Admin → **Données & RGPD** → **Importer les données de départ**. Les 24 associations issues des fiches individuelles et les événements d'exemple sont copiés dans la base.

---

## Fonctionnement au quotidien

| Qui | Action | Résultat |
|---|---|---|
| Association | « Ajouter une association » ou « Modifier la fiche » | La demande arrive dans **Admin → Validation** |
| Association | « Ajouter un événement » | Idem |
| Admin / modérateur | **Valider** | Visible immédiatement par tous les visiteurs |
| Admin / modérateur | **Refuser** | La proposition est supprimée |
| Citoyen | « Contacter cette association » | Le message arrive dans **Admin → Messages** |
| Citoyen | Inscription à la newsletter | L'adresse arrive dans **Admin → Newsletter** |

- **Mot de passe oublié** : un lien sur la page de connexion envoie un e-mail de réinitialisation. Cet envoi est assuré par Firebase.
- **Retirer un utilisateur** (onglet Utilisateurs) : ses droits sont supprimés immédiatement. Son compte de connexion peut ensuite être effacé dans **Authentication**.

## Ce qui reste à prévoir

- **Envoi réel des e-mails** : les messages de contact et la newsletter sont centralisés dans l'admin, mais ne partent pas encore par e-mail. Il faut soit y répondre depuis l'admin (bouton « Répondre »), soit ajouter plus tard l'extension Firebase *Trigger Email*. Cette extension nécessite le forfait « Blaze », payant à l'usage (quelques centimes pour ce volume).
- **Sauvegardes** : exportez régulièrement les données depuis **Admin → Données & RGPD → Exporter (JSON)**.

## Tester sans compte Firebase (développeurs)

```bash
npm run emulators      # émulateurs locaux Auth + Firestore (Java requis)
```

Dans `assets/js/firebase-config.js`, renseignez une configuration de démonstration, par exemple `projectId: 'demo-walhain'` et `apiKey: 'demo-key'`, et passez `WA.FIREBASE_EMULATOR` à `true`. Lancez ensuite `npm start`.

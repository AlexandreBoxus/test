# Guide de l'administrateur

Ce guide s'adresse aux agents communaux et aux modérateurs qui gèrent le portail au quotidien. Aucune connaissance technique n'est nécessaire.

## Se connecter

Cliquez sur **Admin** en haut à droite, puis saisissez votre adresse e-mail et votre mot de passe.

En cas d'oubli, cliquez sur **Mot de passe oublié ?** : un lien de réinitialisation est envoyé par e-mail.

## Traiter les demandes (onglet « Validation »)

Le chiffre orange à côté de **Admin** indique le nombre de demandes en attente. Il s'affiche aussi dans le titre de l'onglet du navigateur.

Pour recevoir une alerte sur votre ordinateur à chaque nouvelle demande, cliquez une fois sur **Recevoir une alerte sur cet ordinateur…**. Les alertes s'affichent tant que le portail reste ouvert dans un onglet, même en arrière-plan.

Pour chaque demande, vous voyez qui l'a envoyée (nom et e-mail) et ce qui est demandé. S'il s'agit d'une modification de fiche, la liste des champs modifiés est indiquée.

| Bouton | Effet |
|---|---|
| **Aperçu** | Affiche la fiche ou l'événement tel qu'il apparaîtra |
| **Valider** | Publie immédiatement. Vous pouvez ensuite préparer un e-mail pour prévenir le demandeur |
| **Demander une précision** | Note votre question sur la demande (qui reste en attente) et prépare un e-mail au demandeur |
| **Refuser** | Refuse avec un motif facultatif. La demande est conservée dans l'historique |

Les e-mails s'ouvrent dans votre messagerie habituelle, déjà rédigés : il ne reste qu'à les relire et les envoyer.

La rubrique **Décisions récentes** garde la trace de qui a décidé quoi, et quand.

Les coordonnées du demandeur ne sont **jamais publiées** : elles disparaissent de la fiche au moment de la validation.

## Modifier le site sans toucher au code (onglet « Contenus du site »)

| Rubrique | Ce que vous pouvez changer |
|---|---|
| **Identité** | Nom du site, sous-titre, nom de la commune, logo, couleur principale et couleur d'accent |
| **Page d'accueil** | Titre, texte d'introduction, encadré « Vous animez une association ? », texte des partenaires, pied de page |
| **Villages** | Ajouter un village (avec ses coordonnées pour la carte) ou le renommer : toutes les fiches sont mises à jour automatiquement |
| **Thématiques** | Ajouter une thématique, choisir son pictogramme et sa couleur, la renommer |
| **Publics cibles** | Ajouter ou renommer un public |

Cliquez sur **Enregistrer** : le site est mis à jour immédiatement pour tous les visiteurs.

Pour protéger les fiches existantes, un village, une thématique ou un public **utilisé** par au moins une fiche ne peut pas être supprimé. Le nombre de fiches concernées est affiché à côté.

Pour trouver les coordonnées d'un village : dans Google Maps, faites un clic droit sur le village. La première ligne du menu affiche les coordonnées (latitude, longitude) ; cliquez dessus pour les copier.

## Les autres onglets

- **Tableau de bord** : chiffres clés, visites, fiches les plus consultées, recherches fréquentes.
- **Associations / Événements** : liste complète, avec boutons pour modifier ou supprimer. Les nouveautés créées par un administrateur sont publiées directement.
- **Messages** : demandes envoyées par les citoyens via « Contacter ». Le bouton **Répondre** ouvre votre messagerie.
- **Newsletter** : abonnés, aperçu automatique des événements à venir, export de la liste.
- **Utilisateurs** (administrateurs uniquement) : ajouter un collègue, en tant qu'**administrateur** (tous les droits) ou **modérateur** (validation et contenus, sans gestion des comptes).
- **Données & RGPD** (administrateurs uniquement) : sauvegarde (à faire régulièrement), recherche et effacement des données d'une personne.

## L'application mobile

Le portail s'installe comme une application :

- **Android et ordinateur (Chrome, Edge)** : cliquez sur **Installer l'appli** dans le menu.
- **iPhone et iPad** : dans Safari, touchez **Partager** puis **Sur l'écran d'accueil**.

L'appli s'ouvre en plein écran et reste consultable sans connexion pour les pages déjà visitées.

## Faire évoluer le portail

Pour ajouter un nouveau champ, une page ou une fonctionnalité, il suffit de décrire le besoin en français à Claude (Claude Code), par exemple : « Ajoute un champ "numéro d'entreprise" aux fiches associations ». Le code est mis à jour, testé et versionné dans le dépôt GitHub.

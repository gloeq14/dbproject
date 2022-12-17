# Changelog

Ce document est organisé par rendu, puis par section du rapport. Chaque entrée indique un changement apporté à la version précédente. 

## Rendu 2 - Dérisquer l'application

### 2.1. Sources et méthodes d'extraction

Nous avons changé nos deux jeux de données pour deux raisons: 

- Premièrement la méthode pour récupérer les restaurants en faisant des requêtes *google place* pour trouver les restaurants proches de chaque points aurait finit par nous couter de l'argent car nous avions sous-estimé le nombre de requêtes à effectuer. De plus, les requêtes *place* ne nous retournent pas de type de restaurant (chinois, indien, fastfood...). Il nous aurait fallu construire des règles basées sur le nom du restaurant, ou faire des requêtes *place* détaillées pour chaque restaurant, une solution bancale et fastidieuse. Nous avons donc trouvé un jeu de données en format geoJSON très récent (2022) comportant tout les restaurants de la ville de Montreal, avec leur type.
- Une fois le jeu des restaurants trouvé, il nous a fallu changé le jeu des pistes cyclables pour faire coincider les villes. Nous travaillerons donc avec un jeu recensant les pistes cyclables de la ville de Montreal (ce changement à été instantanné à mettre en place, le format de donnée est le même que le précédédent: le geoJSON).

>- Précision de la ville choisie
>- Changement des jeux de données
> - Racourcissement du texte pour coincider avec le barème

### 2.2. Exemple de données

> - Mise à jour des exemples pour coincider avec les nouveaux jeux

## Rendu 3 - Remise et présentation écrite du produit minimum viable

### 4.2. Processus d'acquisition incrémentale des données

Ajout du processus de comparaison.

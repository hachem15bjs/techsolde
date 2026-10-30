# Script de présentation — Module d'alertes TechSolde (≈ 5 minutes)

**1. Le problème (30 s)**
« TechSolde vend des produits technologiques en promotion. Une promotion mal configurée coûte de l'argent : une remise de 95 % saisie par erreur, un code Black Friday encore actif une semaine plus tard, ou un coupon populaire qui atteint sa limite d'utilisation. J'ai développé un **Alert Service** qui détecte ces situations automatiquement. »

**2. Alerte ou notification ? (20 s)**
« Une notification dit seulement qu'il s'est passé quelque chose. Une **alerte** décrit une condition qui demande une action : elle a une **sévérité** (low, medium, high, critical), un **statut** (nouvelle, prise en compte, résolue) et des détails qui expliquent pourquoi elle existe. »

**3. L'architecture (45 s)** — montrer le schéma du README
« C'est un service séparé : sa propre application **Express** sur le port 5004 et sa propre base **MongoDB**, `techsolde_alerts`. Il ne touche jamais à la base des promotions : il lit les promotions et les coupons via l'**API REST** du Promotion Service, avec le `fetch` intégré à Node.js. Le tableau de bord React appelle l'Alert Service. »

**4. Node.js et l'asynchrone (45 s)** — ouvrir `detection.service.js` et `promotion-client.js`
« Toutes les opérations d'entrée/sortie — MongoDB et HTTP — sont **asynchrones** : j'utilise `async/await`, donc Node.js continue de répondre aux autres requêtes pendant l'attente. Avec `Promise.all`, je récupère les promotions et les coupons **en parallèle**. Un `setInterval` lance aussi un scan automatique toutes les dix minutes. »

**5. Express : routes et middlewares (45 s)** — ouvrir `alert.routes.js` et `app.js`
« Chaque route associe une méthode HTTP et une URL à un contrôleur : `POST /api/alerts` pour créer, `PATCH /api/alerts/:id/resolve` pour résoudre… Les **middlewares** valident le corps de la requête et l'identifiant MongoDB (erreur 400), vérifient que la base est connectée (503), et un middleware final transforme toutes les erreurs en réponse JSON avec le bon code : 404, 409, 502. »

**6. MongoDB et Mongoose (45 s)** — ouvrir `alert.model.js`, puis Compass
« Le schéma Mongoose définit les champs, les valeurs autorisées et les dates automatiques `createdAt`/`updatedAt`. Un **index unique partiel** garantit qu'il ne peut exister qu'**une seule alerte ouverte** par règle et par promotion : même deux scans simultanés ne peuvent pas créer de doublon. Les statistiques sont calculées par MongoDB avec `countDocuments` et `aggregate`. »

**7. Démonstration (2 min)**
1. « Je crée une promotion qui se termine dans moins de 24 heures. »
2. « Sur la page **Alerts**, je clique sur **Scan Now** : Express interroge le Promotion Service, le JavaScript évalue les cinq règles, et MongoDB enregistre le résultat. Voici l'alerte "Flash Sale expires in 8 hours". »
3. « Dans Compass, le même document est dans la collection `alerts`. »
4. « Je la **prends en compte**, puis je la **résous**. Je rafraîchis : le statut est conservé. »
5. « Je relance le scan : **aucun doublon**. »
6. « Le coupon STUDENT20 a été utilisé 95 fois sur 100 : alerte de sévérité *high*. »
7. « Je crée une alerte manuelle, je la modifie, puis je la supprime. Les statistiques se mettent à jour. »
8. « Si je désactive la promotion expirée puis relance le scan, son alerte est **résolue automatiquement** : la condition a disparu. »

**8. Conclusion (20 s)**
« Ce module montre tout le programme du cours : Node.js, l'exécution asynchrone non bloquante, Express avec ses routes et middlewares, et MongoDB avec Mongoose. L'intelligence est **à base de règles** : de simples conditions JavaScript sur des données réelles, testées automatiquement avec Vitest et Postman. »

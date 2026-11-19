# Aléa

Application mobile de hasard : des **dés pour les jeux de rôle** et des **tirages au sort**.
Elle fonctionne hors ligne, sans compte, en français et en anglais.

Écrite avec React Native (Expo) et TypeScript.

## Les dés

- Une notation de jeu de rôle complète : `3d6+2`, `4d6kh3` (garder les trois meilleurs), `2d20kl1`
  (garder le moins bon), `4d6dl1` (écarter le moins bon), `d6!` (le dé explose), `d20r1`
  (relancer les 1), `d%`.
- Les dés roulent à l'écran puis se posent sur leur résultat. Le résultat est tiré **avant**
  l'animation, avec le générateur aléatoire du système : les dés qui roulent ne sont qu'un décor.
- Sous le résultat, la **loi de probabilité exacte** du lancer : « 14 sort dans 12,3 % des
  lancers ». Elle est calculée (convolution des dés, dénombrement pour « garder les meilleurs »),
  pas estimée. Pour un lancer trop gros pour un calcul exact, elle est estimée par simulation et
  l'écran le dit.
- Historique, personnages et lancers favoris.

## Les tirages

- Listes de noms, avec un **poids** par nom (un nom de poids 2 a deux fois plus de chances).
- Un nom tiré à la roue, aux cartes ou au défilement ; plusieurs noms ; un ordre de passage ; pile
  ou face.
- **Sans remise** sur plusieurs séances : personne ne repasse avant que tous soient passés.
- **Équipes équilibrées** selon un niveau par personne. Jusqu'à 16 personnes, une recherche
  exhaustive garantit le meilleur partage possible ; au-delà, l'écart obtenu est affiché.

## Tirage vérifiable

Un tirage peut être rendu vérifiable :

1. l'appli publie une **empreinte** (SHA-256) de la liste et d'une graine secrète ;
2. un participant tape un mot, **après** avoir vu l'empreinte ;
3. le tirage est fait à partir de la graine et du mot, puis la graine est révélée.

N'importe qui peut coller la preuve dans l'onglet « Vérifier » : l'appli refait le calcul et
contrôle que l'empreinte correspond et que le résultat est le même. Changer le mot, un nom de la
liste ou la graine fait échouer la vérification.

## Le moteur de hasard

Il est écrit en TypeScript pur dans [`src/hasard/`](src/hasard), sans dépendance à l'interface.

| Fichier | Rôle |
|---|---|
| `aleatoire.ts` | entier uniforme **sans biais** (rejet des valeurs au-delà du plus grand multiple), mélange de Fisher-Yates |
| `notation.ts` | lecture de la notation des dés, avec erreurs positionnées |
| `lancer.ts` | un lancer détaillé (relances, explosions, dés écartés) |
| `loi.ts` | loi de probabilité exacte d'un lancer |
| `equite.ts` | engagement SHA-256, flux HMAC-SHA256, vérification |
| `tirages.ts` | tirages pondérés, sans remise, équipes équilibrées |

## Lancer le projet

```sh
npm install
npx expo start --web        # version web, dans le navigateur
npx expo export --platform web
```

Le projet est vérifié dans sa version web. La version Android n'a pas encore été compilée.

## Licence

MIT, voir [LICENSE](LICENSE).

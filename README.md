# EQUILIBRIUM - Jeu HTML/CSS/JavaScript pour VS Code

## Lancer le jeu
1. Ouvre le dossier dans VS Code.
2. Lance `index.html` avec **Live Server** ou ouvre le fichier dans ton navigateur.
3. Les assets sont déjà dans `assets/`.

## Contenu
- `index.html` : structure du jeu et panneau UI
- `style.css` : style de l'interface
- `game.js` : logique complète du gameplay
- `assets/` : planètes pixel art + personnage principal temporaire

## Niveaux implémentés
### Niveau 1 - Equilibrium
- 5 planètes
- Gravité stable
- Météorites toutes les 4 secondes
- NPCs qui sautent toutes les 4 secondes
- Destruction temporaire d'une planète pendant 2 secondes

### Niveau 2 - Chaos
- 8 planètes
- Gravité plus forte
- Météorites toutes les 3 secondes
- Destruction temporaire pendant 1.5 secondes
- Vitesse de jeu augmentée

### Niveau 3 - Gravity Flip
- 10 planètes
- Gravité inversée / répulsive
- Météorites toutes les 2 secondes
- Destruction temporaire pendant 1 seconde
- Challenge extrême

## Contrôles
- `A / ←` : tourner autour d'une planète
- `D / →` : tourner dans l'autre sens
- `Espace / W / ↑` : saut
- `R` : restart
- `N` : niveau suivant (debug)

## Notes sur le main character
Le lien Google Drive fourni n'était pas accessible automatiquement depuis l'environnement de génération. Le projet contient donc un **sprite temporaire** : `assets/main_character.png`.

Dès que tu as un PNG du personnage, remplace simplement ce fichier par ton sprite final avec le même nom.

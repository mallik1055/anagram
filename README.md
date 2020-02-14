## Anagram MultiPlayer 
A multiplayer online game of Anagram, built using socket.io & JS

### How to Play:

* One player (the host) creates a "New Game"
* All other players join the game created by this host
* The game starts when the host presses the "Start Game" button

### Game Rules:

* Players have to guess the right meaningful word from the anagrams prompted by the bot
* Bot gives a first hint after 7 seconds if no right answer is entered by any of the players
* Bot gives a second hint after 5 seconds if no right answer is entered by any of the players
* If no right answer is received after the above steps, the bot moves to the next word and the current round is finished

### Scoring:

* +3 points if answered without any hints
* +2 points if answered after one hint
* +1 point if answered after two hints
* Player who scores 30+ points the earliest wins

### Special Features:

* Players who get disconnected or close the game reflect in the scorecard of all other players live in that game
* Supports multiple game rooms and multiple players in each room at any time
* Included words data set of >2000 in count and words do not repeat ever in the game
* Supports 1 vs 1, 2 vs 2 and 3 vs 3 gameplays, members of a team should enter the same nick

### Shortcuts:

* Up Arrow for previous word (if any) to autofill in text box

### Play the Game

The game can be played on [Glitch](https://omniscient-effect.glitch.me/) - a cool place to host your NodeJs scripts

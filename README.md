# MASTER SCORE CARD BY KRUTAR CROSSWORD — v2

This rebuild supports:
- Training sessions
- Rated tournaments
- Unrated tournaments
- Any number of games per session
- LocalStorage
- CSV/JSON export
- Print
- Google Sheets database submission
- Automatic creation of new players
- Every new player starts at Elo 1500
- Training / unrated sessions do NOT change Elo
- Rated tournaments DO update Elo
- Default K-factor = 32 (editable in Settings and CONFIG)

## Files
- index.html
- styles.css
- app.js
- google-apps-script/Code.gs

## 1) Create the Google Sheet database
1. Create a blank Google Sheet.
2. Extensions → Apps Script.
3. Replace the default code with `google-apps-script/Code.gs`.
4. Save.
5. Run `setupDatabase()` once and authorize.
6. The script creates:
   - PLAYERS
   - SESSIONS
   - GAMES
   - RATINGS
   - CONFIG

## 2) Deploy the API
In Apps Script:
1. Deploy → New deployment.
2. Type: Web app.
3. Execute as: Me.
4. Who has access: Anyone (or the access level suitable for your organization).
5. Deploy.
6. Copy the Web App URL.

## 3) Connect MASTER SCORE CARD
1. Open `index.html` from a web host.
   Note: Google Apps Script requests work most reliably when the front-end is served over HTTPS.
2. Open Settings.
3. Paste the Web App URL into "Google Apps Script Web App URL".
4. Elo Start Rating is already 1500.
5. Default Elo K-factor is 32.

## 4) Approval behavior
Approve is enabled only when:
- Player Name is present.
- Session Name is present.
- Every game has both scores.

For Rated Tournament:
- Opponent Name is required for every game.
- A player not found in PLAYERS is created automatically at 1500.
- Elo is updated sequentially game-by-game.
- Both sides receive opposite Elo changes.

For Training / Unrated Tournament:
- Session and game data are saved.
- New named opponents are still added to PLAYERS at 1500.
- Elo remains unchanged.

## Elo formula
Expected score:
E = 1 / (1 + 10 ^ ((OpponentElo - PlayerElo) / 400))

New rating:
R' = R + K × (Actual - Expected)

Actual:
- Win = 1
- Tie = 0.5
- Loss = 0

The current implementation rounds each game Elo change to the nearest integer.

## Important design note
Player identity currently uses normalized Player Name to detect an existing player.
For a larger public system, the next upgrade should add a unique member code / Player ID selector so two different people with the same name cannot be merged accidentally.


## v3 Duplicate-submit protection
- Each local session receives a persistent `clientSessionKey`.
- Google Apps Script checks the SESSIONS table before any write.
- A repeated key returns `duplicate:true` and does not write GAMES/RATINGS or update Elo.
- `New Session` creates a fresh key and clears only the local score card.
- Existing databases are migrated automatically by appending a `Client Session Key` column to SESSIONS.


## v4 duplicate-lock changes
- A Client Session Key is created once per session and preserved by local save/load and JSON export/import.
- Approved sessions are locked in the UI; use New Session to create a fresh key.
- The Apps Script checks Client Session Key under ScriptLock before any session/game/rating rows are appended.
- Duplicate submissions return the existing Session ID without writing rows or recalculating Elo.
- POST response parsing now reports a useful deployment/access error when Google returns HTML instead of JSON.

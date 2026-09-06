# Polygon Pong: Complete Game Rules

**Ruleset version:** 1.0  
**Game type:** Real-time multiplayer elimination game  
**Players:** Two or more

## 1. Game Summary

Polygon Pong is a multiplayer variation of Pong in which each active player protects one side of a shared arena.

With `N` active players, the main arena is a regular `N`-sided polygon. Each player controls one paddle that moves along the inside of their assigned side. A single ball moves continuously through the arena. When a player fails to return the ball and it passes through their defended side, that player is eliminated.

After each elimination, the arena is rebuilt for the remaining players. This continues until only two players remain. The final two players then compete in a square Pong arena. The last surviving player wins the match.

## 2. Objective

Protect your side of the arena by returning the ball with your paddle.

To win the match, be the final player remaining. A player is eliminated immediately after missing a valid ball directed at their side.

There are no points or extra lives in the standard ruleset. Every stage is sudden death.

## 3. Important Terms

- **Match:** The complete game, from the initial countdown until one winner remains.
- **Active player:** A player who has not been eliminated.
- **Stage:** The portion of the match played with a particular number of active players and a particular arena shape.
- **Rally:** Continuous play beginning with a serve and ending when a player is eliminated.
- **Side:** One boundary edge of the arena assigned to an active player.
- **Paddle:** The movable barrier used by a player to return the ball.
- **Return:** A valid contact between the ball and the inward-facing surface of a paddle.
- **Miss:** The ball reaching a player's defended boundary without making a valid paddle return.
- **Final duel:** The square, two-player stage played by the last two active players.

## 4. Match Setup

### 4.1 Player count

A match requires at least two players. A match with two players begins directly in the final-duel arena. A match with three or more players begins in a polygon with one side per player.

The implementation may set a practical maximum player count based on screen size and server capacity. The same rules apply at every supported player count.

### 4.2 Side assignment

At the beginning of a match:

1. The server determines the cyclic order of the players.
2. Each player receives one side of the polygon.
3. Each paddle begins centered on its assigned side.
4. Every player is shown their color, label, and defended side.

The initial side order may be randomized. After eliminations, the relative clockwise order of the surviving players is preserved.

### 4.3 Initial ball placement

The ball begins at the center of the arena. Its initial direction is selected by the server.

The server must reject an opening direction that is almost parallel to a side or aimed directly into a vertex. This prevents ambiguous or unfair opening shots. The initial direction must not be chosen by a player.

### 4.4 Countdown

Every stage begins with a visible countdown. During the countdown:

- Paddles may be displayed, but the ball does not move.
- Players may prepare their input.
- The server does not accept any claimed collision or ball movement from a client.
- The rally begins when the countdown reaches zero.

A three-second countdown is the recommended default.

## 5. Arena Rules

### 5.1 Multiplayer polygon stage

When three or more players are active:

- The arena is a regular polygon with one side per player.
- Every side is a defended side; there are no permanently safe side walls.
- Each active player owns exactly one side and one paddle.
- The arena is centered within the play area.
- All sides have equal length.
- Paddles use the same proportional length and movement limits.

### 5.2 Final two-player stage

When two players remain, play switches to a square Pong arena:

- One player protects the left goal line.
- The other player protects the right goal line.
- The two paddles move vertically.
- The top and bottom boundaries are solid neutral walls.
- A return from a neutral wall does not belong to either player.
- The first finalist to miss the ball is eliminated.
- The surviving finalist wins the match.

If a match begins with exactly two players, it uses this arena immediately.

### 5.3 Vertices and corners

Polygon vertices are neutral solid corners. If the ball's first contact is exactly with a vertex rather than clearly with one side, the ball bounces inward and no player is eliminated.

Corner contacts must be resolved deterministically by the server. A client may display a predicted bounce, but only the server's result is official.

## 6. Paddle Rules

### 6.1 Movement

A player's paddle may move only along that player's assigned side.

- A paddle cannot leave its side.
- A paddle cannot move around a vertex onto another player's side.
- A paddle cannot overlap a neutral corner area.
- All players have the same maximum paddle speed.
- Opposite directional inputs cancel each other while both are held.
- Releasing movement input causes the paddle to stop; paddles have no required momentum in the standard ruleset.

### 6.2 Paddle size

All active paddles have the same length relative to their side. When the polygon is rebuilt, paddle length is recalculated from the new side length so that no player receives a larger proportional defense area.

A paddle length of approximately 30% of its side is the recommended starting value, subject to playtesting.

### 6.3 Valid paddle contact

A paddle return is valid when the ball reaches the paddle's inward-facing collision surface before reaching the defended boundary behind it.

A paddle cannot save a ball after the server has already registered a miss. Visual overlap caused by network delay does not overturn the server's ruling.

## 7. Ball Rules

### 7.1 General movement

- The standard ruleset uses one ball.
- The ball moves continuously after the stage countdown.
- The ball may collide with paddles, neutral polygon vertices, and neutral walls in the final duel.
- The ball cannot be controlled, held, or carried by a paddle.
- The ball's position and velocity are determined by the server.

### 7.2 Paddle returns

When the ball makes valid contact with a paddle, it returns toward the interior of the arena.

The return angle may be influenced by:

- The point of contact along the paddle.
- The paddle's direction of movement at the moment of contact.
- The inward-facing normal of the defended side.

Contact near the center of a stationary paddle produces a relatively direct inward return. Contact near an end of the paddle produces a sharper angle. Paddle movement may add a limited directional influence, sometimes described as spin.

The server must enforce a minimum inward angle so that the ball cannot travel indefinitely almost parallel to a side.

### 7.3 Ball speed

The ball begins each stage at the configured starting speed. Its speed may increase slightly after valid paddle returns to prevent rallies from continuing indefinitely.

Any speed increase must be predictable and applied equally to all players. The ball must have a maximum speed at which the server can still resolve collisions reliably and players retain a reasonable opportunity to react.

After an arena rebuild, the ball returns to the configured stage-starting speed unless a selected game mode explicitly states otherwise.

### 7.4 Collision priority

The server resolves the earliest physical contact along the ball's movement path. This prevents the ball from passing through a paddle at high speed.

If two contacts occur at the same simulated instant:

1. An exact polygon vertex is treated as a neutral-corner collision.
2. In the final duel, an exact intersection with a neutral top or bottom corner is treated as a neutral-wall collision.
3. No player is eliminated from a geometrically ambiguous corner contact.

## 8. Misses and Elimination

### 8.1 What counts as a miss

A player misses when the ball reaches their defended boundary at a location not covered by their paddle and the server finds no earlier valid paddle collision.

The miss is registered at the first valid boundary-crossing event. The ball does not need to continue traveling off-screen.

### 8.2 Elimination sequence

When a miss occurs:

1. The server stops the active rally.
2. The player assigned to the missed side is eliminated.
3. All clients receive the authoritative elimination result.
4. The eliminated player loses control of a paddle and becomes a spectator.
5. The match either transitions to a smaller arena or ends with a winner.

Only one player can normally be eliminated by a rally because the standard game uses a single ball and the rally ends at the first miss.

### 8.3 No defensive credit requirement

A player does not need to be the last person who touched the ball to eliminate another player. Elimination is determined only by which player fails to defend the side reached by the ball.

### 8.4 Eliminated players

An eliminated player:

- Cannot return to the current match as an active player.
- Cannot move a paddle or affect the ball.
- May continue watching as a spectator.
- Retains their elimination placement for the final results.

## 9. Arena Reduction

After an elimination, the arena does not reshape while the ball is moving. Instead, play pauses and the next stage is prepared.

### 9.1 Transition procedure

1. The eliminated player's result is displayed.
2. The old ball and arena stop being active.
3. The remaining players keep their relative clockwise order.
4. If three or more players remain, the server constructs a new regular polygon with one side per survivor.
5. If two players remain, the server constructs the square final-duel arena.
6. Surviving paddles are placed at the centers of their new sides.
7. The ball is placed at the center.
8. A new countdown begins.

This staged transition prevents a moving ball or paddle from being trapped outside the newly constructed arena.

### 9.2 Fairness after rebuilding

- No surviving player carries a positional advantage into the new arena.
- All paddles restart centered.
- The ball restarts from the center.
- Ball speed resets according to the stage-starting rule.
- The next launch direction is selected by the server using the same fairness constraints as the initial serve.

## 10. Winning and Placement

The match ends when one active player remains.

- The last active player is the winner.
- The player eliminated in the final duel places second.
- Earlier placements are determined by reverse elimination order.
- With normal gameplay, tied placements do not occur because only one player is eliminated per rally.

The results screen should show the winner, final placement order, and optionally match statistics such as returns, longest rally, and survival time. Statistics do not change the winner.

## 11. Disconnects and Inactivity

### 11.1 Temporary connection loss

If an active player temporarily disconnects:

- Their paddle stops at its most recent server-authoritative position.
- The match continues during the configured reconnection grace period.
- The player may resume control if they reconnect before that period expires.
- The server remains authoritative; missed client inputs are not reconstructed from a player's claims.

A ten-second grace period is the recommended default for casual matches. Ranked modes may use a shorter period.

### 11.2 Failed reconnection

If the grace period expires, the disconnected player forfeits and is eliminated. The server then performs the normal arena-reduction procedure.

If the ball causes that player's elimination before the grace period expires, the normal miss takes precedence and the transition begins immediately.

### 11.3 Voluntary departure

Leaving an active match counts as an immediate forfeit. The departing player is eliminated and receives the corresponding placement.

### 11.4 Inactivity while connected

A connected player is not eliminated merely for leaving their paddle stationary. They remain active until they miss, disconnect beyond the grace period, or leave the match.

## 12. Server Authority and Fair Play

The game server is the sole authority for:

- Ball position and velocity.
- Paddle positions used for collision checks.
- Collision order and return angles.
- Misses and eliminations.
- Arena transitions.
- Match time, countdowns, and the winner.

Clients send control inputs, such as movement direction, rather than authoritative positions or outcomes. Client-side prediction may make movement look immediate, but it cannot override the server.

The following are invalid and must be ignored or corrected by the server:

- Moving faster than the maximum paddle speed.
- Moving beyond the assigned side.
- Claiming a paddle hit or elimination.
- Altering the ball's state.
- Sending inputs for another player.
- Sending gameplay input after elimination.

## 13. Spectators

Spectators may observe the match but cannot affect gameplay.

- Eliminated players automatically become spectators unless they leave.
- Spectator views may be delayed without changing the match.
- Spectator messages or reactions must not alter ball physics, paddle movement, countdowns, or results.

## 14. Pauses and Match Failure

The standard online ruleset does not allow an individual player to pause an active rally.

The server may pause or cancel a match because of a server-wide technical failure. If authoritative state cannot be recovered fairly, the match is declared **no contest** rather than selecting a winner from incomplete information.

If every remaining player forfeits or disconnects before a winner can be determined, the match is also declared no contest. A player who remains validly connected while all opponents forfeit wins normally.

## 15. Standard Ruleset Summary

1. Every active player protects one side with one paddle.
2. The server launches one ball from the center.
3. Players move only along their assigned sides.
4. A paddle contact returns the ball into the arena.
5. Missing the ball causes immediate elimination.
6. After an elimination, play pauses and the arena is rebuilt for the survivors.
7. The last two players switch to a square classical-Pong arena.
8. The first finalist to miss is eliminated.
9. The last surviving player wins.
10. The server makes every official gameplay decision.

## 16. Recommended Default Configuration

These values are implementation defaults rather than immutable rules. They should be adjusted through playtesting without changing the core elimination format.

| Setting                     | Recommended default                    |
| --------------------------- | -------------------------------------- |
| Minimum players             | 2                                      |
| Suggested multiplayer range | 3–8 players                            |
| Balls in play               | 1                                      |
| Lives per player            | 1                                      |
| Stage countdown             | 3 seconds                              |
| Paddle length               | 30% of side length                     |
| Paddle momentum             | None                                   |
| Ball acceleration           | Small increase after each valid return |
| Ball speed cap              | Required                               |
| Arena rebuild               | After every elimination                |
| Final-duel scoring          | Sudden death; first miss loses         |
| Reconnection grace period   | 10 seconds in casual play              |
| Gameplay authority          | Server only                            |

## 17. Optional Modes Not Included in the Standard Rules

The following ideas may be added later, but they are not part of this standard ruleset:

- Multiple balls.
- Multiple lives.
- First-to-five scoring in the final duel.
- Power-ups or paddle abilities.
- Teams.
- Shrinking paddles.
- Persistent ball speed between stages.
- Player-controlled serves.
- Mid-rally arena deformation.

Clients and servers must agree on any optional mode before the match begins. A mode should never change silently during an active match.

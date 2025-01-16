# Pool Palooza

## Introduction
Pool Palooza is a game focused on precision and strategy. The goal is to pot ten uniquely designed balls within the least number of shots. Distinct gameplay effects are triggered when certain balls are potted, such as the swinging of the camera when a brown ball is potted for an added challenge. Players pot the ball by shooting the cue ball with their mouse such that it bounces other balls into the pockets. The player wins when they pot all ten balls, but loses if the cue ball falls into a pocket. 

## Video Demo (w/ sound)

https://github.com/user-attachments/assets/aa42cd33-6f4d-4727-9b4f-f3bd2f7c6f55



Alternative link if embed playback fails: https://drive.google.com/file/d/127Jzm5xvbI6dcmsq9uA2Ia5QLqzuX6OC/view?usp=sharing



## Usage Instructions

Players control the direction and force when shooting the cue ball by a click-and-drag aiming system from behind the cue ball to simulate pulling the cue stick back before shooting. Moving the cursor further back from the cue ball will result in a shot with more force.

The user can press the 'r' button to restart the game at any point, clearing any ball status effects and returning all balls to their original formation. They can also press the ‘i’ button to see which color ball corresponds to which ball effect when pocketed.

## Features

Pool Palooza consists of several visual, functional, and mechanical features, including ten unique ball game mechanics, a real-time stats display, fluid user game controls, event-triggered audio tracks, table pockets, and pool table scene.

**Stats Display:** Constantly updated metrics on the number of shots taken and balls potted.

**Unique Ball Properties: Each ball has special effects that influence gameplay dynamics of the next shot:**
- Green: Speeds up the next shot’s velocity.
- Orange: Randomizes the positions of remaining all balls.
- Black (8-Ball): Game over if it's not the last ball pocketed.
- Yellow: Activates sticky walls (no rebound).
- Red: Ball shoots in the opposite direction.
- Blue: Turns all balls black until the next one is pocketed.
- Purple: Removes trajectory guide on the next shot.
- Pink: Magnet cue ball that attracts nearby balls.
- Brown: Rotates the camera view while aiming.
- Gray: Normal ball with no special effects.

**Scene:** Gameplay occurs on flat, walled table viewed from a bird’s eye orthographic angle for aiming, transitioning to a 3D perspective view following the cue ball post-shot

**Pockets:** The player must shoot the cue ball so that it collides with the other balls and hits them into one of the six pockets.

**Audio:** Engaging background music along with sound effects for collisions, ball pocketing, and distinct sounds for game over and victory scenarios.

**Controls:** Options for restarting the game, toggling background music, and a key to display information about all of the balls' properties.

## Advanced Features

In addition, three advanced features are implemented – mouse-based shot control, collision detection, and physics-based simulation.

**Mouse-Based Shot Control:** Mouse-based controls for ball trajectory and velocity. Mouse controls are implemented through mousedown, mousemove, and mouseup event listeners that track the mouse's position and state. When the mouse is pressed and moved, it calculates the direction and force for the shot, applying it to the cue ball's velocity when the mouse is released.

**Collision Detection:** When balls hit each other or walls, we detect the collisions. Collision detection involves iterating over all balls to check for collisions with other balls and the walls. For ball-to-ball, it calculates the normal and relative velocity, applies an impulse based on the collision, and separates the balls to prevent sticking. For ball-to-wall collisions, it inverts the ball's velocity component perpendicular to the wall and applies a slight dampening effect. 

**Physics-Based Simulation:** When balls collide, we simulate where the balls will go based on the laws of physics. The physics simulation is managed in the update_balls method, which updates each ball's position based on its velocity and applies friction by slightly reducing the velocity over time. 




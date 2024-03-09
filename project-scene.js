import {defs, tiny} from './examples/common.js';
import MouseControls from "./MouseControls.js";

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class Project_Scene extends Scene {
    constructor() {
        // constructor(): Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            ball: new defs.Subdivision_Sphere(4),
            table: new defs.Square(),
            wall: new defs.Square(),
            line: new defs.Square(),
            pocket: new defs.Rounded_Capped_Cylinder(100, 40, [[0, 40], [0, 40]]),
            wall_3d: new defs.Cube(),
        };


        this.drag = false;
        this.mouse_coords = vec3(0,0,1);
        // *** Materials
        this.materials = {
            ball: new Material(new defs.Phong_Shader(),
                {ambient: 0.9, specularity: 0.2, color: hex_color("#dfe6c1")}),
            table: new Material(new defs.Phong_Shader(),
            { ambient: 1, color: hex_color("#4F7942") }),
            wall: new Material(new defs.Phong_Shader(),
                { ambient: 1, color: hex_color("#732b11") }),
            pocket: new Material(new defs.Phong_Shader(),
                {ambient: 1, color: hex_color("#000000")})
        }

        this.balls = [
            { position: vec3(8, 0, 1), velocity: vec3(0, 0, 0), color: "#dfe6c1", isCueBall: true, isActive: true }, // Cue ball
            { position: vec3(-8.4, 0, 1), velocity: vec3(0, 0, 0), color: "#FFFFFF", isCueBall: false, isActive: true }, 
            { position: vec3(-10.2, 1, 1), velocity: vec3(0, 0, 0), color: "#FFFFFF", isCueBall: false, isActive: true }, 
            { position: vec3(-10.2, -1, 1), velocity: vec3(0, 0, 0), color: "#GF03FFF", isCueBall: false, isActive: true }, 
            { position: vec3(-12, 2, 1), velocity: vec3(0, 0, 0), color: "#FFA500", isCueBall: false, isActive: true }, 
            { position: vec3(-12, 0, 1), velocity: vec3(0, 0, 0), color: "#042F12", isCueBall: false, isActive: true }, 
            { position: vec3(-12, -2, 1), velocity: vec3(0, 0, 0), color: "#00FF00", isCueBall: false, isActive: true }, 
            { position: vec3(-13.8, -3, 1), velocity: vec3(0, 0, 0), color: "#F23FFF", isCueBall: false, isActive: true },
            { position: vec3(-13.8, -1, 1), velocity: vec3(0, 0, 0), color: "#0000FF", isCueBall: false, isActive: true },
            { position: vec3(-13.8, 1, 1), velocity: vec3(0, 0, 0), color: "#FFA500", isCueBall: false, isActive: true }, 
            { position: vec3(-13.8, 3, 1), velocity: vec3(0, 0, 0), color: "#FFFF00", isCueBall: false, isActive: true }, 
        ];

        this.pockets = [
            { position: vec3(-19.5, -9.5, 0.01)},
            { position: vec3(19.5, -9.5, 0.01)},
            { position: vec3(0, -10, 0.01)},
            { position: vec3(0, 10, 0.01)},
            { position: vec3(19.5, 9.5, 0.01)},
            { position: vec3(-19.5, 9.5, 0.01)},
]

        
        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 30), vec3(0, 0, 0), vec3(0, 1, 0));

        this.initial_is_set = false;
        this.shoot_processed = false;

        // audio
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.soundBuffers = {};
        this.loadSound('ballCollision', './assets/ballCollision.mp3');
        this.loadSound('cueHit', './assets/cueHit.mp3');
        this.loadSound('background', './assets/background.mp3');
        this.loadSound('score', './assets/score.mp3');
        this.loadSound('victory', './assets/victory.mp3');
        this.loadSound('defeat', './assets/defeat.mp3');
        // TODO: pocket, victory, defeat sounds when logic is implemented
    }

    async loadSound(key, url) {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        this.audioContext.decodeAudioData(arrayBuffer, (buffer) => {
            this.soundBuffers[key] = buffer; // Store buffer with its key
        }, (e) => console.error("Error with decoding audio data: ", e.err));
    }

    playSound(key) {
        const soundBuffer = this.soundBuffers[key];
        if (soundBuffer) {
            const source = this.audioContext.createBufferSource();
            source.buffer = soundBuffer;
            source.connect(this.audioContext.destination);
            source.start(0);
        } else {
            console.log("Sound buffer for '" + key + "' is not loaded");
        }
    }


    update(context, program_state) {
        const dt = program_state.animation_delta_time / 1000;
    
        this.update_balls(dt);
     
        this.collision_detected();

        this.display(context, program_state);
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Cue ball POV", ["Control", "0"], () => this.attached = () => this.initial_camera_location);
        this.new_line();
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:

        var cue_ball = this.balls.find(ball => ball.isCueBall)
        var cue_vel = cue_ball.velocity;
        var cue_is_moving = Math.sqrt(cue_vel.dot(cue_vel)) - 1 > 0.02;

        if (cue_is_moving) {
            this.initial_camera_location = Mat4.look_at(cue_ball.position.minus(this.initial_shoot_dir.normalized().times(4)).plus(vec3(0,0,2)), cue_ball.position, vec3(0, 0, 1));
        }
        else {
            this.initial_camera_location = Mat4.look_at(vec3(0, 0, 30), vec3(0, 0, 0), vec3(0, 1, 0));

        }

        if (!context.scratchpad.controls) {
            // this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            program_state.set_camera(this.initial_camera_location);
        }
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;
        this.setup_mouse_controls(context.canvas, dt);
        this.mouse_controls = new MouseControls(this.camera, program_state)
        this.update_balls(dt);
        //some failed attempts at using MouseControls.js to get mouse-to-world-space ray (https://github.com/junhongwang418/museum-3d/blob/c9d6631f78d22d312c2c29836a8b2cc63817f4a5/Controls/MovementControls.js#L49)
        //this.mouse_controls.update(program_state);
        //program_state.current_ray = this.mouse_controls.current_ray;
        //program_state.ray_start_position =this.initial_camera_location;
        this.collision_detected(t);

        this.table_width = 20;
        this.table_height = 10;
        this.wall_thickness = 1;
        this.collided = false;

        if (cue_is_moving) {
            program_state.projection_transform = Mat4.perspective(
                Math.PI / 4, context.width / context.height, .1, 100);
        }
        else {
            let m = Mat4.orthographic(-1.0, 1.0, -1.0, 1.0, 0, 100);

            let plane_size = 23;
            let ratio = context.width / context.height;
            let right = plane_size;
            let left = -plane_size;
            let top = plane_size / ratio;
            let bottom = -plane_size / ratio;
            let near = 1;
            let far = 100;

            let A = Mat4.scale(1 / (right - left), 1 / (top - bottom), 1 / (far - near));
            let B = Mat4.translation(-left - right, -top - bottom, -near - far);
            let C = Mat4.scale(2, 2, -2);
            let orthographic_proj = A.times(B).times(C);

            program_state.projection_transform = orthographic_proj;
        }

        let model_transform = Mat4.identity();

        this.draw_light(context, program_state, model_transform, t);

        var t_p2 = model_transform.times(Mat4.rotation(t, 0, 1, 0)).times(Mat4.translation(8, 0, 0));
        this.balls.forEach(ball => {
            if (ball.isActive) {
                this.draw_ball(context, program_state, ball.position, ball.color);
            }
        });

        this.draw_table(context, program_state, model_transform, t);
        this.draw_wall(context, program_state, model_transform, t);
        this.draw_pockets(context, program_state);
        if (this.drag) {
            const cueBallPosition = this.balls.find(ball => ball.isCueBall).position;
            const oppositeDirection = this.initial_mouse_pos.minus(this.mouse_coords);
            var oppositeEnd = cueBallPosition.plus(oppositeDirection);

            //clamp to avoid walls
            if (oppositeEnd[0] > 20) {
                var scale_to_wall = (20 - cueBallPosition[0]) / oppositeDirection[0];
                oppositeEnd = cueBallPosition.plus(oppositeDirection.times(scale_to_wall));
            } else if (oppositeEnd[0] < -20) {
                var scale_to_wall = (-20 - cueBallPosition[0]) / oppositeDirection[0];
                oppositeEnd = cueBallPosition.plus(oppositeDirection.times(scale_to_wall));
            }
            if (oppositeEnd[1] > 10) {
                var scale_to_wall = (10 - cueBallPosition[1]) / oppositeDirection[1];
                oppositeEnd = cueBallPosition.plus(oppositeDirection.times(scale_to_wall));
            } else if (oppositeEnd[1] < -10) {
                var scale_to_wall = (-10 - cueBallPosition[1]) / oppositeDirection[1];
                oppositeEnd = cueBallPosition.plus(oppositeDirection.times(scale_to_wall));
            }

            this.draw_aim(context, program_state, cueBallPosition, oppositeEnd);
        }
        if (this.attached !== undefined) {
            program_state.camera_inverse = this.attached().map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
        }

    }

    setup_mouse_controls(canvas, dt) {
        let dragging = false;
        const rect = canvas.getBoundingClientRect(); // Get canvas position and size
        
        canvas.addEventListener('mousedown', (e) => {
            dragging = true;
            this.drag = true;
            if (!this.initial_is_set) {
                const x = (((e.clientX - rect.left) / rect.width) - 0.5) * 23 * 2;
                const y = (-(((e.clientY - rect.top) / rect.height) - 0.5)) * 12.7 * 2;
                this.initial_mouse_pos = vec3(x, y, 1);
                this.mouse_coords = this.initial_mouse_pos;
                console.log(this.initial_mouse_pos);
                this.initial_is_set = true;
                this.shoot_processed = false;
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (dragging) {
                // Convert mouse coordinates to canvas space
                const x = (((e.clientX - rect.left) / rect.width) - 0.5) * 23 * 2;
                const y = (-(((e.clientY - rect.top) / rect.height) - 0.5)) * 12.7 * 2;
                this.mouse_coords = vec3(x, y, 1);
                // Find the cue ball in the balls array
                const cueBall = this.balls.find(ball => ball.isCueBall);
                if (cueBall) {
                    // Directly manipulate the position of the cue ball based on mouse movement
                    // cueBall.position = vec3(x, y, 1); // Update cue ball position
                    
                    // cueBall.velocity = vec3((x - cueBall.position[0]) / dt, (y - cueBall.position[1]) / dt, 0);
                }
            }
        });
        
        canvas.addEventListener('mouseup', (e) => {
            // this.playSound('cueHit');
            console.log("mouse up");
            dragging = false;
            this.drag = false;
            // Reset the velocity of the cue ball when the mouse is released
            const cueBall = this.balls.find(ball => ball.isCueBall);
            // if (cueBall) {
            //     cueBall.velocity = vec3(0, 0, 0);
            // }

            if (!this.shoot_processed) {
                const x = (((e.clientX - rect.left) / rect.width) - 0.5) * 23 * 2;
                const y = (-(((e.clientY - rect.top) / rect.height) - 0.5)) * 12.7 * 2;
                var final_mouse_pos = vec3(x, y, 1);
                console.log(final_mouse_pos);
                this.mouse_coords = final_mouse_pos;
                var shoot_dir = (this.initial_mouse_pos.minus(final_mouse_pos)).times(3);
                this.initial_shoot_dir = shoot_dir;

                if (cueBall) {
                    this.playSound('cueHit');
                    cueBall.velocity = cueBall.velocity.plus(shoot_dir);
                }

                this.initial_is_set = false;
                this.shoot_processed = true;
            }

        });
    }
    

    update_balls(dt) {
        this.balls.forEach(ball => {
            // Update position based on velocity
            ball.position = ball.position.plus(ball.velocity.times(dt));
    
            // Apply friction (or some form of deceleration)
            ball.velocity = ball.velocity.times(0.98); // Adjust the friction coefficient as needed
        });
    
        // Handle collisions
        this.collision_detected();
    }
    

    collision_detected() {
        let wallBounce = false;
        
        this.balls.forEach((ball1, index1) => {

            // Ball-to-pocket collisions
            this.pockets.forEach(pocket =>{
                const distance = ball1.position.minus(pocket.position).norm();
                if (distance < 2) {
                    if (ball1.color === "#000000") {  // 8 ball logic
                        if (this.balls.filter(b => b.isActive && !b.isCueBall).length > 1) {
                            console.log("game end");
                        }
                    }
                    ball1.isActive = false; 
                }
            })
            // Ball-to-wall collisions
            if (Math.abs(ball1.position[0]) > (this.table_width - this.wall_thickness)) {
                ball1.velocity[0] *= -0.8;
                ball1.position[0] = Math.sign(ball1.position[0]) * (this.table_width- this.wall_thickness);
                wallBounce = true;
            }
            if (Math.abs(ball1.position[1]) > (this.table_height - this.wall_thickness)) {
                ball1.velocity[1] *= -0.8;
                ball1.position[1] = Math.sign(ball1.position[1]) * (this.table_height - this.wall_thickness);
                wallBounce = true;
            }
            
            // Ball-to-ball collisions
            this.balls.forEach((ball2, index2) => {
                if (index1 !== index2) {
                    const distance = ball1.position.minus(ball2.position).norm();
                    if (distance < 2) { // Assuming each ball has a radius of 1
                        this.playSound('ballCollision');
                        const collisionNormal = ball1.position.minus(ball2.position).normalized();
                        const relativeVelocity = ball1.velocity.minus(ball2.velocity);
                        const velocityAlongNormal = relativeVelocity.dot(collisionNormal);
                        
                        // Skip if velocities are separating
                        if (velocityAlongNormal > 0) return;
                        
                        // Using simplified model for equal mass and perfectly elastic collision
                        const impulse = velocityAlongNormal * -1;
                        ball1.velocity = ball1.velocity.plus(collisionNormal.times(impulse));
                        ball2.velocity = ball2.velocity.minus(collisionNormal.times(impulse));
    
                        // To prevent balls from "sticking" together, adjust their positions slightly apart
                        const overlap = 2 - distance;
                        ball1.position = ball1.position.plus(collisionNormal.times(overlap / 2));
                        ball2.position = ball2.position.minus(collisionNormal.times(overlap / 2));
                    }
                }
            });
        });
    
        return wallBounce;
    }

    draw_table(context, program_state, model_transform, t){
        let table_transform = model_transform.times(Mat4.scale(this.table_width, this.table_height, 1));
        this.shapes.table.draw(context, program_state, table_transform, this.materials.table);
    }
    draw_pockets(context, program_state) {
        this.pockets.forEach(pocket => {
            // First, translate the pocket to its position, then apply scaling.
            // This ensures that the pocket is placed at the correct location with the correct size.
            let pocket_transform = Mat4.translation(...pocket.position)
                                   .times(Mat4.scale(1.4, 1.4, 0.005));
            this.shapes.pocket.draw(context, program_state, pocket_transform, this.materials.pocket);
        });
    }
    
    draw_aim(context, program_state, start_point, end_point) {
        if (start_point[0] < end_point[0]) { //mirror it
            let temp = start_point;
            start_point = end_point;
            end_point = temp;
        }

        let direction = end_point.minus(start_point);
        let length = direction.norm();
        let midpt = start_point.plus(end_point).times(0.5);
        direction = direction.normalized();

        let a = vec3(0, 1, 0);
        let b = direction;
        let dot_product = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
        let magnitude_a = a.norm(); // Calculate magnitude using norm()
        let magnitude_b = b.norm(); // Calculate magnitude using norm()
        let angle = Math.acos(dot_product / (magnitude_a * magnitude_b));

        let line_transform = Mat4.translation(midpt[0], midpt[1], midpt[2])
            .times(Mat4.rotation(angle, 0, 0, 1))
            .times(Mat4.scale(0.05, length*0.5, 0.05));

        this.shapes.line.draw(context, program_state, line_transform, this.materials.table.override({ color: hex_color("#FFFFFF") }));
    }


    draw_wall(context, program_state, model_transform, t){
        let wall_transform = model_transform.times(Mat4.translation(0, 0, -0.1)).times(Mat4.scale(21.1, 10.95, 0));
        this.shapes.wall.draw(context, program_state, wall_transform, this.materials.wall);

        this.shapes.wall_3d.draw(context, program_state, model_transform.times(Mat4.scale(0.5, 10, 1.5)).times(Mat4.translation(41, 0, -0.1)), this.materials.wall);
        this.shapes.wall_3d.draw(context, program_state, model_transform.times(Mat4.scale(0.5, 10, 1.5)).times(Mat4.translation(-41, 0, -0.1)), this.materials.wall);
        this.shapes.wall_3d.draw(context, program_state, model_transform.times(Mat4.scale(21.1, 0.5, 1.5)).times(Mat4.translation(0, 21, -0.1)), this.materials.wall);
        this.shapes.wall_3d.draw(context, program_state, model_transform.times(Mat4.scale(21.1, 0.5, 1.5)).times(Mat4.translation(0, -21, -0.1)), this.materials.wall);
    }

    draw_light(context, program_state, model_transform, t) {
        let sun_color = color(1, 1, 1, 1); 
        const light_position = vec4(0, 0, 10, 1);
        program_state.lights = [new Light(light_position, sun_color, 20)];
    }

    draw_ball(context, program_state, position, color) {
        let ball_transform = Mat4.translation(...position)
        let ball_material = this.materials.ball.override({color: hex_color(color)});
        
        this.shapes.ball.draw(context, program_state, ball_transform, ball_material);
    }
    
}
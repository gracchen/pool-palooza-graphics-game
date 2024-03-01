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
        };

        // *** Materials
        this.materials = {
            ball: new Material(new defs.Phong_Shader(),
                {ambient: 0.9, specularity: 0.2, color: hex_color("#dfe6c1")}),
            table: new Material(new defs.Phong_Shader(),
            { ambient: 1, color: hex_color("#4F7942") }),
            wall: new Material(new defs.Phong_Shader(),
                { ambient: 1, color: hex_color("#732b11") }),

        }

        this.balls = [
            { position: vec3(6, 0, 1), velocity: vec3(0, 0, 0), color: "#dfe6c1", isCueBall: true }, // Cue ball
            { position: vec3(-6, 0, 1), velocity: vec3(0, 0, 0), color: "#FFFFFF", isCueBall: false },
            { position: vec3(-8, 2, 1), velocity: vec3(0, 0, 0), color: "#FF0000", isCueBall: false }, // Red ball
            { position: vec3(-8, -2, 1), velocity: vec3(0, 0, 0), color: "#00FF00", isCueBall: false }  // Green ball
        ];
        
        
        this.initial_camera_location = Mat4.look_at(vec3(0, 0, 30), vec3(0, 0, 0), vec3(0, 1, 0));
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("View solar system", ["Control", "0"], () => this.attached = () => this.initial_camera_location);
        this.new_line();
        this.key_triggered_button("Attach to planet 1", ["Control", "1"], () => this.attached = () => this.planet_1);
        this.key_triggered_button("Attach to planet 2", ["Control", "2"], () => this.attached = () => this.planet_2);
        this.new_line();
        this.key_triggered_button("Attach to planet 3", ["Control", "3"], () => this.attached = () => this.planet_3);
        this.key_triggered_button("Attach to planet 4", ["Control", "4"], () => this.attached = () => this.planet_4);
        this.new_line();
        this.key_triggered_button("Attach to moon", ["Control", "m"], () => this.attached = () => this.moon);
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
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

        let m = Mat4.orthographic(-1.0, 1.0, -1.0, 1.0, 0, 100);

        let plane_size = 23;
        let ratio  = context.width / context.height;
        let right  = plane_size;
        let left   = -plane_size;
        let top    = plane_size / ratio;
        let bottom = -plane_size / ratio;
        let near   = 1;
        let far    = 100;

        let A = Mat4.scale(1 / (right - left), 1 / (top - bottom), 1 / (far - near));
        let B = Mat4.translation(-left - right, -top - bottom, -near - far);
        let C = Mat4.scale(2, 2, -2);
        let orthographic_proj = A.times(B).times(C);

        program_state.projection_transform = orthographic_proj;


        let model_transform = Mat4.identity();

        this.draw_light(context, program_state, model_transform, t);

        var t_p2 = model_transform.times(Mat4.rotation(t, 0, 1, 0)).times(Mat4.translation(8, 0, 0));
        this.balls.forEach(ball => {
            this.draw_ball(context, program_state, ball.position, ball.color);
        });

        this.draw_table(context, program_state, model_transform, t);
        this.draw_wall(context, program_state, model_transform, t);

        if (this.attached !== undefined) {
            program_state.camera_inverse = this.attached().map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
        }

    }

    setup_mouse_controls(canvas, dt) {
        let dragging = false;
        const rect = canvas.getBoundingClientRect(); // Get canvas position and size
        
        canvas.addEventListener('mousedown', (e) => {
            dragging = true;
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (dragging) {
                // Convert mouse coordinates to canvas space
                const x = (((e.clientX - rect.left) / rect.width) - 0.5) * 23 * 2;
                const y = (-(((e.clientY - rect.top) / rect.height) - 0.5)) * 12.7 * 2;
                
                // Find the cue ball in the balls array
                const cueBall = this.balls.find(ball => ball.isCueBall);
                if (cueBall) {
                    // Directly manipulate the position of the cue ball based on mouse movement
                    cueBall.position = vec3(x, y, 1); // Update cue ball position
                    
                    // Update the velocity of the cue ball based on mouse movement
                    // This calculation assumes that 'dt' is the time difference between mousemove events, which might not be accurate.
                    // You might need to calculate 'dt' differently or use a fixed value for a consistent experience.
                    cueBall.velocity = vec3((x - cueBall.position[0]) / dt, (y - cueBall.position[1]) / dt, 0);
                }
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            dragging = false;
            // Reset the velocity of the cue ball when the mouse is released
            const cueBall = this.balls.find(ball => ball.isCueBall);
            if (cueBall) {
                cueBall.velocity = vec3(0, 0, 0);
            }
        });
    }
    
    update_balls(dt) {
        this.balls.forEach(ball => {
            // Skip the cue ball based on the isCueBall flag
            if (!ball.isCueBall) {
                // Update position based on velocity with ad-hoc compensation
                ball.position[0] += 8000000 * dt * ball.velocity[0];
                ball.position[1] += 12000000 * dt * ball.velocity[1];
                // Assuming balls move only on the X and Y axes and ignoring Z-axis for simplicity

                // Apply friction to slow down the ball
                ball.velocity[0] -= 0.15 * ball.velocity[0];
                ball.velocity[1] -= 0.15 * ball.velocity[1];
    
                // Apply friction to slow down the ball
                ball.velocity[0] = Math.sign(ball.velocity[0]) * Math.max(0, Math.abs(ball.velocity[0]) - 0.15 * Math.abs(ball.velocity[0]));
                ball.velocity[1] = Math.sign(ball.velocity[1]) * Math.max(0, Math.abs(ball.velocity[1]) - 0.15 * Math.abs(ball.velocity[1]));
                // This ensures that the ball's velocity reduces to zero but doesn't flip direction due to friction

            }
        });
    }

    collision_detected() {
        let wallBounce = false;
        
        this.balls.forEach((ball1, index1) => {
            // Ball-to-wall collisions
            if (Math.abs(ball1.position[0]) > (this.table_width - this.wall_thickness)) {
                ball1.velocity[0] *= -1;
                ball1.position[0] = Math.sign(ball1.position[0]) * (this.table_width- this.wall_thickness);
                wallBounce = true;
            }
            if (Math.abs(ball1.position[1]) > (this.table_height - this.wall_thickness)) {
                ball1.velocity[1] *= -1;
                ball1.position[1] = Math.sign(ball1.position[1]) * (this.table_height - this.wall_thickness);
                wallBounce = true;
            }
            
            // Ball-to-ball collisions
            this.balls.forEach((ball2, index2) => {
                if (index1 !== index2) {
                    const distance = ball1.position.minus(ball2.position).norm();
                    if (distance < 2) { // Assuming each ball has a radius of 1
                        const collisionNormal = ball1.position.minus(ball2.position).normalized();
                        const relativeVelocity = ball1.velocity.minus(ball2.velocity);
                        const velocityAlongNormal = relativeVelocity.dot(collisionNormal);
                        
                        // Skip if velocities are separating
                        if (velocityAlongNormal > 0) return;
                        
                        // Using simplified model for equal mass and perfectly elastic collision
                        const impulse = velocityAlongNormal * -2;
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

    draw_wall(context, program_state, model_transform, t){
        let wall_transform = model_transform.times(Mat4.translation(0, 0, -0.1)).times(Mat4.scale(21.1, 10.95, 0));
        this.shapes.wall.draw(context, program_state, wall_transform, this.materials.wall);
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
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

        this.cue_ball_position = vec3(6, 0, 1);
        this.ball_position = vec3(-6, 0, 1);

        this.cue_ball_color = "#dfe6c1";
        this.ball_color = "#FFFFFF"

        this.cue_ball_start_time = 0;
        this.cue_ball_initial_x = 6;
        this.cue_ball_initial_y = 0;
        this.cue_velocity = vec3(0,0,0);

        this.ball_velocity = vec3(0,0,0);
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
        //console.log(program_state.current_ray);
        //program_state.ray_start_position =this.initial_camera_location;
        this.collision_detected(t);

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

        // program_state.projection_transform = Mat4.perspective(
        //     Math.PI / 4, context.width / context.height, .1, 1000);

        let model_transform = Mat4.identity();

        this.draw_light(context, program_state, model_transform, t);

        var t_p2 = model_transform.times(Mat4.rotation(t, 0, 1, 0)).times(Mat4.translation(8, 0, 0));
        this.draw_ball(context, program_state, this.cue_ball_position, this.cue_ball_color);
        this.draw_ball(context, program_state, this.ball_position, this.ball_color);
        // this.draw_ball(context, program_state, vec3(0,0,1), this.ball_color);
        // this.draw_ball(context, program_state, vec3(10,-2,1), this.ball_color);
        // this.draw_ball(context, program_state, vec3(-10,-4,1), this.ball_color);
        this.draw_table(context, program_state, model_transform, t);
        this.draw_wall(context, program_state, model_transform, t);

        if (this.attached !== undefined) {
            program_state.camera_inverse = this.attached().map((x,i) => Vector.from(program_state.camera_inverse[i]).mix(x, 0.1));
        }

    }

    update_balls(dt){
        //ball
        //console.log(this.cue_ball_position);
        this.ball_position[0] += 1000000*dt*this.ball_velocity[0];
        this.ball_position[1] += 1000000*dt*this.ball_velocity[1];

        this.ball_velocity[0] -= 0.1*this.ball_velocity[0];
        this.ball_velocity[1] -= 0.1*this.ball_velocity[1];
    }

    setup_mouse_controls(canvas, dt) {
        let dragging = false;
        const rect = canvas.getBoundingClientRect(); // Get canvas position and size
    
        canvas.addEventListener('mousedown', (e) => {
            dragging = true;
        });

        canvas.addEventListener('mousemove', (e) => {
            // console.log((e.clientX / rect.width) - 0.5);
            // console.log(rect.right);
            if (dragging) {
                // Convert mouse coordinates to canvas space

                const x = (((e.clientX - rect.left) / rect.width) - 0.5) * 23 * 2; // Example conversion
                const y = (-(((e.clientY - rect.top) / rect.height) - 0.5)) * 12.7 * 2; // Example conversion

                //console.log((y - this.cue_ball_position[1]));
                this.cue_velocity = vec3((x - this.cue_ball_position[0])/dt, (y - this.cue_ball_position[1])/dt, 0);
                this.cue_ball_position = vec3(x, y, 1); // Update cue ball position
            }
        });

        const width = (rect.right - rect.left);
        const height = (rect.bottom - rect.top);

        //normalized screen space coords of mouse click
        const mouse_position = (e, rect = canvas.getBoundingClientRect()) =>
            vec(
                (e.clientX - (rect.left + rect.right) / 2) * 2 / width,
                (e.clientY - (rect.bottom + rect.top) / 2) * 2 / height
            );

        canvas.addEventListener('click', (e) => {
            let mouse = mouse_position(e)
            let mouse_screen_space = vec3(mouse[0], mouse[1], 0);
            //console.log(mouse_screen_space);
        });

        canvas.addEventListener('mouseup', () => {
            dragging = false;
            this.cue_velocity = vec3(0,0,0);
        });
    }

    collision_detected(time) { //only between the two balls for now, turns red.
        let x1 = this.cue_ball_position[0]
        let y1 = this.cue_ball_position[1]
        let z1 = this.cue_ball_position[2]

        let x2 = this.ball_position[0]
        let y2 = this.ball_position[1]
        let z2 = this.ball_position[2]

        //this.ball_position = vec3(x, y, 1);
        let dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2 + (z2 - z1) ** 2);
        if (dist < 2) {
            //console.log("colliding!");
            this.cue_ball_color = "#ff7575";
            this.ball_color = "#ff7575";
            this.ball_velocity = this.cue_velocity;
            //console.log("velocity = ", this.ball_velocity);
            return true;
        }
        else {
            this.cue_ball_color = "#dfe6c1";
            this.ball_color = "#FFFFFF";
            return false;
        }
    }

    draw_table(context, program_state, model_transform, t){
        let table_transform = model_transform.times(Mat4.scale(20, 10, 1));
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
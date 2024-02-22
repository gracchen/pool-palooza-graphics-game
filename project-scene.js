import {defs, tiny} from './examples/common.js';

const {
    Vector, Vector3, vec, vec3, vec4, color, hex_color, Shader, Matrix, Mat4, Light, Shape, Material, Scene,
} = tiny;

export class Project_Scene extends Scene {
    constructor() { // Scenes begin by populating initial values like the Shapes and Materials they'll need.
        super();

        // At the beginning of our program, load one of each of these shape definitions onto the GPU.
        this.shapes = {
            torus: new defs.Torus(15, 15),
            torus2: new defs.Torus(3, 15),
            sphere: new defs.Subdivision_Sphere(4),
            circle: new defs.Regular_2D_Polygon(1, 15),
            // TODO: Fill in as many additional shape instances as needed in this key/value table.
        };

        // *** Materials
        this.materials = {
            test: new Material(new defs.Phong_Shader(),
                {ambient: .2, diffusivity: .6, specularity: .2, color: hex_color("#ffffff")}),
            test2: new Material(new defs.Phong_Shader(),
                {ambient: .4, diffusivity: .7, specularity: 1, color: hex_color("#992828")}),
            // TODO:  Fill in as many additional material objects as needed in this key/value table.
        }

        this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));
        //TODO: camera options
    }

    make_control_panel() {
        // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
        this.key_triggered_button("Birds eye view", ["Control", "0"], () => this.attached = () => null);
        this.new_line();
        this.key_triggered_button("Attach to cue ball", ["Control", "1"], () => this.attached = () => this.cue_ball);
    }

    display(context, program_state) {
        // display():  Called once per frame of animation.
        // Setup -- This part sets up the scene's overall camera matrix, projection matrix, and lights:
        if (!context.scratchpad.controls) {
            this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
            // Define the global camera and projection matrices, which are stored in program_state.
            //TODO: link camera buttons to camera pos
            program_state.set_camera(this.initial_camera_location);
        }

        program_state.projection_transform = Mat4.perspective(
            Math.PI / 4, context.width / context.height, .1, 1000);

        // TODO: Lighting - can be simple, like shinier (more specular) balls vs matte table
        const light_position = vec4(0, 5, 5, 1);
        // The parameters of the Light are: position, color, size
        program_state.lights = [new Light(light_position, color(1, 1, 1, 1), 1000)];

        // TODO:  Create Table and Balls, do matrix operations and drawing code to draw scene
        const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000;

        const white = hex_color("#ffffff");
        const grey = hex_color("#8a8a8a");
        const green = hex_color("#0e4e17");

        let model_transform = Mat4.identity();

        this.shapes.sphere.draw(context, program_state, model_transform, this.materials.test.override({color: white}));
    }
}
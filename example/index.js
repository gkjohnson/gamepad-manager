import {
	Color,
	Group,
	PerspectiveCamera,
	PMREMGenerator,
	Scene,
	Timer,
	Vector3,
	WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ControllerManager } from '../src/index.js';

const URL = './models/xbox-controller.glb';

// how far parts move when pressed, and how much each press tilts the controller
const PRESS_DEPTH = 0.006;
const TRIGGER_DEPTH = 0.02;
const STICK_TRAVEL = 0.015;
const TILT = 0.2;

// directions in the model: into its face, right and down along the face, and back toward the grips
const IN = new Vector3( 0, - 0.75, - 0.66 ).normalize();
const RIGHT = new Vector3( 1, 0, 0 );
const DOWN = new Vector3().crossVectors( IN, RIGHT );
const PULL = new Vector3( 0, 0, 1 );

// gamepad buttons and the model parts they move
const LEFT_STICK = [ 'stick_left_cap', 'stick_left_ring', 'stick_left_base' ];
const RIGHT_STICK = [ 'stick_right_cap', 'stick_right_ring', 'stick_right_base' ];
const BUTTONS = [
	{ name: 'south', parts: [ 'button_a' ] },
	{ name: 'east', parts: [ 'button_b' ] },
	{ name: 'west', parts: [ 'button_x' ] },
	{ name: 'north', parts: [ 'button_y' ] },
	{ name: 'select', parts: [ 'button_view' ] },
	{ name: 'start', parts: [ 'button_menu' ] },
	{ name: 'home', parts: [ 'button_guide', 'guide_logo' ] },
	{ name: 'dpad-up', parts: [ 'dpad' ] },
	{ name: 'dpad-down', parts: [ 'dpad' ] },
	{ name: 'dpad-left', parts: [ 'dpad' ] },
	{ name: 'dpad-right', parts: [ 'dpad' ] },
	{ name: 'left-stick', parts: LEFT_STICK },
	{ name: 'right-stick', parts: RIGHT_STICK },
	{ name: 'left-bumper', parts: [ 'bumper_left' ] },
	{ name: 'right-bumper', parts: [ 'bumper_right' ] },
	{ name: 'left-trigger', parts: [ 'trigger_left' ], direction: PULL, depth: TRIGGER_DEPTH },
	{ name: 'right-trigger', parts: [ 'trigger_right' ], direction: PULL, depth: TRIGGER_DEPTH },
];
const STICKS = [
	{ x: 'left-x', y: 'left-y', parts: LEFT_STICK },
	{ x: 'right-x', y: 'right-y', parts: RIGHT_STICK },
];

const _force = new Vector3();
const _torque = new Vector3();
const _tilt = new Vector3();
const _axis = new Vector3();

// camera
const camera = new PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 0.1, 100 );
camera.position.set( 0, 0.35, 1.2 );
camera.lookAt( 0, 0, 0 );

// renderer
const renderer = new WebGLRenderer( { antialias: true } );
renderer.setAnimationLoop( animate );
document.body.appendChild( renderer.domElement );

// scene
const scene = new Scene();
scene.background = new Color( 0x131619 );
scene.environment = new PMREMGenerator( renderer ).fromScene( new RoomEnvironment() ).texture;

// the controller sways in this group and tilts within it
const sway = new Group();
scene.add( sway );

// input
const timer = new Timer();
const status = document.getElementById( 'status' );
const manager = new ControllerManager();
manager.addEventListener( 'connected', e => {

	if ( e.slot === 0 ) status.textContent = e.controller.id;

} );

manager.addEventListener( 'disconnected', e => {

	if ( e.slot === 0 ) status.textContent = 'Press a button on a controller';

} );

// load the controller, swapping part names for the parts and keeping each part's rest position
let model = null;
const parts = [];
new GLTFLoader()
	.loadAsync( URL )
	.then( gltf => {

		model = gltf.scene;
		sway.add( model );

		const getParts = names => names.map( name => {

			const part = model.getObjectByName( name );
			if ( ! parts.includes( part ) ) {

				part.userData.rest = part.position.clone();
				parts.push( part );

			}

			return part;

		} );

		BUTTONS.forEach( button => button.parts = getParts( button.parts ) );
		STICKS.forEach( stick => stick.parts = getParts( stick.parts ) );

	} );

onResize();
window.addEventListener( 'resize', onResize );

// animation
function animate( timestamp ) {

	timer.update( timestamp );
	manager.update();

	if ( model ) {

		updateController( timer.getDelta() );

		const time = timer.getElapsed();
		sway.rotation.y = 0.25 * Math.sin( time * 0.5 );
		sway.rotation.x = 0.08 * Math.sin( time * 0.7 );
		sway.position.y = 0.02 * Math.sin( time );

	}

	renderer.render( scene, camera );

}

// moves the parts for the gamepad in slot 0 and tilts the controller from the pushes
function updateController( delta ) {

	for ( let i = 0, l = parts.length; i < l; i ++ ) {

		parts[ i ].position.copy( parts[ i ].userData.rest );

	}

	_torque.set( 0, 0, 0 );

	const pad = manager.getController( 0 );
	if ( pad && pad.connected ) {

		for ( let i = 0, l = BUTTONS.length; i < l; i ++ ) {

			const { name, parts, direction = IN, depth = PRESS_DEPTH } = BUTTONS[ i ];
			push( parts, direction, pad.getAxis( name ), depth );

		}

		for ( let i = 0, l = STICKS.length; i < l; i ++ ) {

			const { x, y, parts } = STICKS[ i ];
			push( parts, RIGHT, pad.getAxis( x ), STICK_TRAVEL );
			push( parts, DOWN, pad.getAxis( y ), STICK_TRAVEL );

		}

	}

	// ease toward the tilt from the current pushes, the same at any frame rate
	_tilt.lerp( _torque, 1 - Math.exp( - 12 * delta ) );

	const angle = _tilt.length() * TILT;
	if ( angle > 0 ) {

		model.quaternion.setFromAxisAngle( _axis.copy( _tilt ).normalize(), angle );

	} else {

		model.quaternion.identity();

	}

}

// moves parts along a direction by "amount" of their full travel, adding the push's turning force
function push( parts, direction, amount, travel ) {

	if ( amount === 0 ) return;

	for ( let i = 0, l = parts.length; i < l; i ++ ) {

		parts[ i ].position.addScaledVector( direction, amount * travel );

	}

	_force.copy( direction ).multiplyScalar( amount );
	_torque.add( _force.cross( parts[ 0 ].userData.rest ).negate() );

}

function onResize() {

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

}

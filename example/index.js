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
import { DualShockControllerModel, XboxControllerModel } from '../src/three/index.js';

// the model shown for each controller brand, with the Xbox model for anything else
const MODELS = {
	xbox: { url: './models/xbox-controller.glb', ModelClass: XboxControllerModel },
	playstation: { url: './models/dualshock-controller.glb', ModelClass: DualShockControllerModel },
};

// how much the pushes tilt the controller
const TILT = 0.1;

// while no gamepad is connected, a random button or stick is pushed every interval, in seconds
const RANDOM_INTERVAL = 1.2;
const RANDOM_HOLD = 0.5;
const RANDOM_BUTTONS = [
	'south', 'east', 'west', 'north', 'select', 'start', 'home',
	'left-stick', 'right-stick', 'left-bumper', 'right-bumper', 'left-trigger', 'right-trigger',
	'dpad-up', 'dpad-down', 'dpad-left', 'dpad-right',
];
const RANDOM_STICKS = [
	{ x: 'left-x', y: 'left-y' },
	{ x: 'right-x', y: 'right-y' },
];
const RANDOM_NAMES = [ ...RANDOM_BUTTONS, ...RANDOM_STICKS.flatMap( s => [ s.x, s.y ] ) ];

// stands in for a gamepad, easing each value toward its target so presses look smooth
const randomInput = {
	values: {},
	targets: {},
	nextPress: 0,
	release: 0,
	getAxis( name ) {

		return this.values[ name ] || 0;

	},
};

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

// input: show the model for the connected controller's brand
const timer = new Timer();
const status = document.getElementById( 'status' );
const manager = new ControllerManager();
manager.addEventListener( 'connected', e => {

	if ( e.slot !== 0 ) return;
	status.textContent = e.controller.id;
	showModel( e.controller.brand );

} );

manager.addEventListener( 'disconnected', e => {

	if ( e.slot === 0 ) status.textContent = 'Press a button on a controller';

} );

// load and show a controller model, keeping each loaded model to switch back to
let model = null;
let shownBrand = null;
const loaded = {};
showModel( 'xbox' );

function showModel( brand ) {

	brand = brand in MODELS ? brand : 'xbox';
	shownBrand = brand;
	if ( ! loaded[ brand ] ) {

		const { url, ModelClass } = MODELS[ brand ];
		loaded[ brand ] = new GLTFLoader()
			.loadAsync( url )
			.then( gltf => new ModelClass( gltf.scene ) );

	}

	loaded[ brand ].then( controllerModel => {

		if ( shownBrand !== brand ) return;
		if ( model ) sway.remove( model );
		model = controllerModel;
		sway.add( model );

	} );

}

onResize();
window.addEventListener( 'resize', onResize );

// animation
function animate( timestamp ) {

	timer.update( timestamp );
	manager.update();

	const delta = timer.getDelta();
	const time = timer.getElapsed();
	updateRandomInput( time, delta );

	if ( model ) {

		// show the gamepad in slot 0, or the random input if none is connected
		const pad = manager.getController( 0 );
		model.setFromController( pad && pad.connected ? pad : randomInput );

		// ease toward the tilt from the current pushes, the same at any frame rate
		_tilt.lerp( model.getTilt( _torque ), 1 - Math.exp( - 12 * delta ) );

		const angle = _tilt.length() * TILT;
		if ( angle > 0 ) {

			model.quaternion.setFromAxisAngle( _axis.copy( _tilt ).normalize(), angle );

		} else {

			model.quaternion.identity();

		}

	}

	sway.rotation.y = 0.25 * Math.sin( time * 0.5 );
	sway.rotation.x = 0.08 * Math.sin( time * 0.7 );
	sway.position.y = 0.02 * Math.sin( time );

	renderer.render( scene, camera );

}

// presses a random button or pushes a random stick each interval, then lets go
function updateRandomInput( time, delta ) {

	const { values, targets } = randomInput;
	if ( time > randomInput.nextPress ) {

		randomInput.nextPress = time + RANDOM_INTERVAL;
		randomInput.release = time + RANDOM_HOLD;

		const index = Math.floor( Math.random() * ( RANDOM_BUTTONS.length + RANDOM_STICKS.length ) );
		if ( index < RANDOM_BUTTONS.length ) {

			targets[ RANDOM_BUTTONS[ index ] ] = 1;

		} else {

			const { x, y } = RANDOM_STICKS[ index - RANDOM_BUTTONS.length ];
			const angle = Math.random() * 2 * Math.PI;
			targets[ x ] = Math.cos( angle );
			targets[ y ] = Math.sin( angle );

		}

	}

	const ease = 1 - Math.exp( - 15 * delta );
	const released = time > randomInput.release;
	for ( let i = 0, l = RANDOM_NAMES.length; i < l; i ++ ) {

		const name = RANDOM_NAMES[ i ];
		if ( released ) targets[ name ] = 0;

		const value = values[ name ] || 0;
		values[ name ] = value + ( ( targets[ name ] || 0 ) - value ) * ease;

	}

}

function onResize() {

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

}

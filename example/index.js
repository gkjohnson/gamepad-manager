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

// the model shown for each controller brand, with the Xbox model for anything else, and how far to
// tip it to show its top edge while the bumpers or triggers are in use
const MODELS = {
	xbox: { url: './models/xbox-controller.glb', ModelClass: XboxControllerModel, topAngle: 1.2 },
	playstation: { url: './models/dualshock-controller.glb', ModelClass: DualShockControllerModel, topAngle: 0.6 },
};

// how much the pushes tilt the controller
const TILT = 0.1;

// the bumpers and triggers, how long after they're let go the view tips back, and roughly how long it
// takes to tip toward the top and back to the front, in seconds
const SHOULDER_BUTTONS = [ 'left-bumper', 'right-bumper', 'left-trigger', 'right-trigger' ];
const SHOULDER_HOLD = 1;
const TIP_TIME = 0.3;
const RETURN_TIME = 0.8;

// how far below the view the controller waits while no gamepad is connected, roughly how long it
// takes to slide in, and how long to slide out, in seconds
const HIDDEN_Y = - 1.1;
const SLIDE_TIME = 0.2;
const EXIT_TIME = 0.4;

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
window.manager = manager;
manager.addEventListener( 'connected', e => {

	if ( e.slot !== 0 ) return;
	status.textContent = e.controller.id;
	showModel( e.controller.brand );

} );

manager.addEventListener( 'disconnected', e => {

	if ( e.slot !== 0 ) return;
	status.textContent = 'Plug in a controller and press a button';
	hideModel();

} );

// the model for the gamepad in slot 0, which slides up into view while one is connected and back down
// out of view when it disconnects, keeping each loaded model to switch back to
let model = null;
let shown = false;
let shownBrand = null;
let lastShoulderTime = - Infinity;

// the current tip toward the top and slide into view, and how fast each is moving. A slide out
// records when it started and from where
const tip = { value: 0, velocity: 0 };
const slide = { value: HIDDEN_Y, velocity: 0, exitStart: - 1, exitFrom: 0 };
const loaded = {};
const DEFAULT_BRAND = 'xbox';

// slides the model out of view, removing it once it's gone ( see animate )
function hideModel() {

	shown = false;

}

function showModel( brand ) {

	brand = brand in MODELS ? brand : DEFAULT_BRAND;
	shown = true;
	shownBrand = brand;
	if ( ! loaded[ brand ] ) {

		const { url, ModelClass } = MODELS[ brand ];
		loaded[ brand ] = new GLTFLoader()
			.loadAsync( url )
			.then( gltf => new ModelClass( gltf.scene ) );

	}

	loaded[ brand ].then( controllerModel => {

		if ( ! shown || shownBrand !== brand || model === controllerModel ) return;
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
	const pad = manager.getController( 0 );
	if ( model && pad ) {

		// show the gamepad in slot 0, which reads as released once disconnected
		model.setFromController( pad );

		// note when the bumpers or triggers were last in use
		for ( let i = 0, l = SHOULDER_BUTTONS.length; i < l; i ++ ) {

			if ( pad.getAxis( SHOULDER_BUTTONS[ i ] ) > 0.05 ) lastShoulderTime = time;

		}

		// ease toward the tilt from the current pushes, the same at any frame rate
		_tilt.lerp( model.getTilt( _torque ), 1 - Math.exp( - 12 * delta ) );

		const angle = _tilt.length() * TILT;
		if ( angle > 0 ) {

			model.quaternion.setFromAxisAngle( _axis.copy( _tilt ).normalize(), angle );

		} else {

			model.quaternion.identity();

		}

	}

	// tip the controller to show its top while the bumpers or triggers are in use, easing slowly back
	// to the front view a moment after they're let go
	const target = model && time - lastShoulderTime < SHOULDER_HOLD ? MODELS[ shownBrand ].topAngle : 0;
	smoothDamp( tip, target, target > 0 ? TIP_TIME : RETURN_TIME, delta );

	// slide the model up into view while a gamepad is connected, once it's loaded. On the way out it
	// eases in, starting slowly and leaving at speed, and is removed once it's gone
	if ( shown && model ) {

		slide.exitStart = - 1;
		smoothDamp( slide, 0, SLIDE_TIME, delta );

	} else if ( model ) {

		if ( slide.exitStart < 0 ) {

			slide.exitStart = time;
			slide.exitFrom = slide.value;

		}

		// keep the speed, so a controller reconnecting mid-exit turns it around smoothly
		const t = Math.min( ( time - slide.exitStart ) / EXIT_TIME, 1 );
		const previous = slide.value;
		slide.value = slide.exitFrom + ( HIDDEN_Y - slide.exitFrom ) * t * t * t;
		slide.velocity = delta > 0 ? ( slide.value - previous ) / delta : 0;
		if ( t === 1 ) {

			sway.remove( model );
			model = null;
			slide.exitStart = - 1;

		}

	}

	sway.rotation.y = 0.25 * Math.sin( time * 0.5 );
	sway.rotation.x = tip.value + 0.08 * Math.sin( time * 0.7 );
	sway.position.y = slide.value + 0.02 * Math.sin( time );

	renderer.render( scene, camera );

}

// moves "state.value" toward "target" like a critically damped spring, keeping "state.velocity" so
// a changed target doesn't jolt it; "smoothTime" is roughly how long it takes to get there
function smoothDamp( state, target, smoothTime, delta ) {

	const omega = 2 / smoothTime;
	const x = omega * delta;
	const decay = 1 / ( 1 + x + 0.48 * x * x + 0.235 * x * x * x );
	const change = state.value - target;
	const temp = ( state.velocity + omega * change ) * delta;
	state.velocity = ( state.velocity - omega * temp ) * decay;
	state.value = target + ( change + temp ) * decay;

}

function onResize() {

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

}

import {
	Color,
	Group,
	Mesh,
	MeshBasicMaterial,
	PerspectiveCamera,
	PMREMGenerator,
	Scene,
	SphereGeometry,
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
	playstation: { url: './models/dualshock-controller.glb', ModelClass: DualShockControllerModel, topAngle: 1.45 },
};
const DEFAULT_BRAND = 'xbox';

// up to four controllers shown at once, each in a cell of this size, two to a row past two
const MAX_SHOWN = 4;
const CELL_WIDTH = 1.1;
const CELL_HEIGHT = 0.8;
const LAYOUT_TIME = 0.3;

// four player dots under each controller, the first N lit for player N
const DOT_GEOMETRY = new SphereGeometry( 0.005, 16, 8 );
const DOT_LIT = new MeshBasicMaterial( { color: 0xffffff } );
const DOT_UNLIT = new MeshBasicMaterial( { color: 0x3a3f44 } );
const DOT_SPACING = 0.022;
const DOTS_BELOW = 0.34;

// how much the pushes tilt a controller
const TILT = 0.1;

// each shown controller sways from its own phase, stepped by the golden ratio of the slowest sway's
// period so no two line up in any of the sways
const SWAY_STEP = 4 * Math.PI * ( Math.sqrt( 5 ) - 1 ) / 2;

// the bumpers and triggers, how long after they're let go the view tips back, and roughly how long it
// takes to tip toward the top and back to the front, in seconds
const SHOULDER_BUTTONS = [ 'left-bumper', 'right-bumper', 'left-trigger', 'right-trigger' ];
const SHOULDER_HOLD = 1;
const TIP_TIME = 0.3;
const RETURN_TIME = 0.8;

// how far below its place a controller waits before sliding in, how far back it's pushed while
// sliding so it passes behind the others, roughly how long it takes to slide in, and how long to
// slide out, in seconds
const HIDDEN_Y = - 1.6;
const HIDDEN_Z = - 0.6;
const SLIDE_TIME = 0.2;
const EXIT_TIME = 0.4;

const _torque = new Vector3();
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

// all the controllers, scaled together to fit the view
const stage = new Group();
const stageScale = { value: 1, velocity: 0 };
scene.add( stage );

// one display per controller shown: a connected gamepad, or a dummy with no gamepad. Each sways in
// its own group, positioned in the layout, while its model tilts within it
const displays = [];
let dummyCount = 0;
let lastShownCount = - 1;

function addDisplay( controller, brand ) {

	brand = brand in MODELS ? brand : DEFAULT_BRAND;
	const display = {
		controller,
		brand,
		model: null,
		group: new Group(),
		dots: new Group(),
		player: 1,
		shown: true,
		x: { value: 0, velocity: 0 },
		y: { value: 0, velocity: 0 },
		tip: { value: 0, velocity: 0 },
		slide: { value: HIDDEN_Y, velocity: 0, exitStart: - 1, exitFrom: 0 },
		tilt: new Vector3(),
		lastShoulderTime: - Infinity,
		swayIndex: freeSwayIndex(),
	};

	// connected gamepads come first, in slot order, then dummies
	let index = displays.length;
	if ( controller ) {

		const slot = manager.controllers.indexOf( controller );
		index = displays.findIndex( d => ! d.controller || manager.controllers.indexOf( d.controller ) > slot );
		if ( index === - 1 ) index = displays.length;

	}

	displays.splice( index, 0, display );
	stage.add( display.group, display.dots );

	for ( let i = 0; i < MAX_SHOWN; i ++ ) {

		const dot = new Mesh( DOT_GEOMETRY, DOT_UNLIT );
		dot.position.x = ( i - ( MAX_SHOWN - 1 ) / 2 ) * DOT_SPACING;
		display.dots.add( dot );

	}

	loadModel( brand ).then( model => {

		display.model = model;
		display.group.add( model );

	} );

	// start in its place in the layout so it slides straight up
	layout();
	display.x.value = display.x.target;
	display.y.value = display.y.target;

}

// slides a display out of view; it's removed once gone ( see updateDisplay )
function hideDisplay( display ) {

	display.shown = false;

}

function countShown() {

	let count = 0;
	for ( let i = 0, l = displays.length; i < l; i ++ ) if ( displays[ i ].shown ) count ++;
	return count;

}

// the lowest sway index no shown display is using
function freeSwayIndex() {

	let index = 0;
	while ( displays.some( d => d.shown && d.swayIndex === index ) ) index ++;
	return index;

}

// the last dummy still shown, or null
function lastDummy() {

	for ( let i = displays.length - 1; i >= 0; i -- ) {

		if ( ! displays[ i ].controller && displays[ i ].shown ) return displays[ i ];

	}

	return null;

}

// a new copy of a brand's model, loading the file once
const loaded = {};
function loadModel( brand ) {

	const { url, ModelClass } = MODELS[ brand ];
	if ( ! loaded[ brand ] ) loaded[ brand ] = new GLTFLoader().loadAsync( url );
	return loaded[ brand ].then( gltf => new ModelClass( gltf.scene.clone() ) );

}

// input: a display for each connected gamepad, making room by removing a dummy if needed
const timer = new Timer();
const status = document.getElementById( 'status' );
const manager = new ControllerManager();
window.manager = manager;
manager.addEventListener( 'connected', e => {

	if ( countShown() >= MAX_SHOWN ) {

		const dummy = lastDummy();
		if ( ! dummy ) return;
		hideDisplay( dummy );

	}

	addDisplay( e.controller, e.controller.brand );

} );

manager.addEventListener( 'disconnected', e => {

	const display = displays.find( d => d.controller === e.controller && d.shown );
	if ( display ) hideDisplay( display );

} );

// up and down add and remove dummy controllers, alternating brands
manager.getKeyboard().addEventListener( 'pressed', e => {

	if ( e.name === 'ArrowUp' && countShown() < MAX_SHOWN ) {

		addDisplay( null, dummyCount % 2 === 0 ? 'xbox' : 'playstation' );
		dummyCount ++;

	} else if ( e.name === 'ArrowDown' ) {

		const dummy = lastDummy();
		if ( dummy ) hideDisplay( dummy );

	}

} );

onResize();
window.addEventListener( 'resize', onResize );

// animation
function animate( timestamp ) {

	timer.update( timestamp );
	manager.update();

	const delta = timer.getDelta();
	const time = timer.getElapsed();

	layout();
	smoothDamp( stageScale, stageScale.target, LAYOUT_TIME, delta );
	stage.scale.setScalar( stageScale.value );

	// backwards, since displays that have slid out are removed
	for ( let i = displays.length - 1; i >= 0; i -- ) updateDisplay( displays[ i ], time, delta );

	const shownCount = countShown();
	if ( shownCount !== lastShownCount ) {

		status.textContent = shownCount === 0 ? 'Plug in a controller and press a button' : '';
		lastShownCount = shownCount;

	}

	renderer.render( scene, camera );

}

// sets each shown display's target place, in a row of up to two or a grid of two rows, and the
// stage scale that fits them in the view
function layout() {

	const count = countShown();
	const columns = Math.min( count, 2 );
	const rows = Math.ceil( count / 2 );

	let index = 0;
	let dummyPlayer = 1;
	for ( let i = 0, l = displays.length; i < l; i ++ ) {

		const display = displays[ i ];
		if ( ! display.shown ) continue;

		// an odd one out in the last row is centered
		const row = Math.floor( index / columns );
		const inRow = Math.min( columns, count - row * columns );
		const column = index % columns;
		display.x.target = ( column - ( inRow - 1 ) / 2 ) * CELL_WIDTH;
		display.y.target = ( ( rows - 1 ) / 2 - row ) * CELL_HEIGHT;
		index ++;

		// connected gamepads show their manager slot, which comes first, and dummies the numbers left
		if ( display.controller ) {

			display.player = manager.controllers.indexOf( display.controller ) + 1;

		} else {

			while ( isGamepadPlayer( dummyPlayer ) ) dummyPlayer ++;
			display.player = dummyPlayer ++;

		}

	}

	// the visible area at the controllers' distance from the camera, with a margin
	const distance = camera.position.length();
	const height = 2 * distance * Math.tan( camera.fov * Math.PI / 360 ) * 0.85;
	const width = height * camera.aspect;
	stageScale.target = count === 0 ? 1 : Math.min( 1, width / ( columns * CELL_WIDTH ), height / ( rows * CELL_HEIGHT ) );

}

// whether a shown gamepad's display has player number "player"
function isGamepadPlayer( player ) {

	for ( let i = 0, l = displays.length; i < l; i ++ ) {

		const display = displays[ i ];
		if ( display.shown && display.controller && display.player === player ) return true;

	}

	return false;

}

// moves, sways, tips and slides one display, and shows its gamepad's buttons
function updateDisplay( display, time, delta ) {

	const { controller, model, group, tip, slide, tilt } = display;

	smoothDamp( display.x, display.x.target, LAYOUT_TIME, delta );
	smoothDamp( display.y, display.y.target, LAYOUT_TIME, delta );

	if ( model && controller ) {

		// show the gamepad, which reads as released once disconnected
		model.setFromController( controller );

		// note when the bumpers or triggers were last in use
		for ( let i = 0, l = SHOULDER_BUTTONS.length; i < l; i ++ ) {

			if ( controller.getAxis( SHOULDER_BUTTONS[ i ] ) > 0.05 ) display.lastShoulderTime = time;

		}

		// ease toward the tilt from the current pushes, the same at any frame rate
		tilt.lerp( model.getTilt( _torque ), 1 - Math.exp( - 12 * delta ) );

		const angle = tilt.length() * TILT;
		if ( angle > 0 ) {

			model.quaternion.setFromAxisAngle( _axis.copy( tilt ).normalize(), angle );

		} else {

			model.quaternion.identity();

		}

	}

	// tip the controller to show its top while the bumpers or triggers are in use, easing slowly back
	// to the front view a moment after they're let go
	const target = time - display.lastShoulderTime < SHOULDER_HOLD ? MODELS[ display.brand ].topAngle : 0;
	smoothDamp( tip, target, target > 0 ? TIP_TIME : RETURN_TIME, delta );

	// slide up into place once loaded. On the way out it eases in, starting slowly and leaving at
	// speed, and is removed once gone
	if ( display.shown ) {

		if ( model ) smoothDamp( slide, 0, SLIDE_TIME, delta );

	} else {

		if ( slide.exitStart < 0 ) {

			slide.exitStart = time;
			slide.exitFrom = slide.value;

		}

		const t = Math.min( ( time - slide.exitStart ) / EXIT_TIME, 1 );
		slide.value = slide.exitFrom + ( HIDDEN_Y - slide.exitFrom ) * t * t * t;
		if ( t === 1 ) {

			stage.remove( group, display.dots );
			displays.splice( displays.indexOf( display ), 1 );

		}

	}

	// pushed fully back over the lower half of the slide, coming forward over the upper half
	const z = HIDDEN_Z * Math.min( 1, 2 * slide.value / HIDDEN_Y );

	const phase = display.swayIndex * SWAY_STEP;
	group.position.set( display.x.value, display.y.value + slide.value + 0.02 * Math.sin( time + phase ), z );
	group.rotation.y = 0.25 * Math.sin( ( time + phase ) * 0.5 );
	group.rotation.x = tip.value + 0.08 * Math.sin( ( time + phase ) * 0.7 );

	// the player dots stay level under the controller
	const dots = display.dots;
	dots.position.set( display.x.value, display.y.value + slide.value - DOTS_BELOW, z );
	for ( let i = 0, l = dots.children.length; i < l; i ++ ) {

		dots.children[ i ].material = i < display.player ? DOT_LIT : DOT_UNLIT;

	}

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

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

// the bumpers and triggers, how long after they're let go, in seconds, the view tips back, and how
// quickly it tips toward the top and back to the front
const SHOULDER_BUTTONS = [ 'left-bumper', 'right-bumper', 'left-trigger', 'right-trigger' ];
const SHOULDER_HOLD = 1;
const TIP_SPEED = 4;
const RETURN_SPEED = 1.2;

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

	if ( e.slot === 0 ) status.textContent = 'Press a button on a controller';

} );

// load and show a controller model, keeping each loaded model to switch back to
let model = null;
let shownBrand = null;
let topAngle = 0;
let lastShoulderTime = - Infinity;
const loaded = {};
const DEFAULT_BRAND = 'xbox';
showModel( DEFAULT_BRAND );

function showModel( brand ) {

	brand = brand in MODELS ? brand : DEFAULT_BRAND;
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
	const topTarget = model && time - lastShoulderTime < SHOULDER_HOLD ? MODELS[ shownBrand ].topAngle : 0;
	const speed = topTarget > topAngle ? TIP_SPEED : RETURN_SPEED;
	topAngle += ( topTarget - topAngle ) * ( 1 - Math.exp( - speed * delta ) );

	sway.rotation.y = 0.25 * Math.sin( time * 0.5 );
	sway.rotation.x = topAngle + 0.08 * Math.sin( time * 0.7 );
	sway.position.y = 0.02 * Math.sin( time );

	renderer.render( scene, camera );

}

function onResize() {

	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setPixelRatio( window.devicePixelRatio );

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

}

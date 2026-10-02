/** @import { Object3D } from 'three' */
/** @import { Controller } from '../Controller.js' */
import { Box3, Group, Vector3 } from 'three';

// how far parts move when fully pressed, in model units ( the models are about 0.82 wide ), or
// rotate, in radians
const PRESS_DEPTH = 0.006;
const DPAD_ANGLE = 0.12;
const STICK_ANGLE = 0.35;
const TRIGGER_ANGLE = 0.3;

// controller button names and the model parts they press
const BUTTONS = [
	[ 'south', 'button_south' ],
	[ 'east', 'button_east' ],
	[ 'west', 'button_west' ],
	[ 'north', 'button_north' ],
	[ 'select', 'button_select' ],
	[ 'start', 'button_start' ],
	[ 'home', 'button_home' ],
	[ 'left-stick', 'stick_left' ],
	[ 'right-stick', 'stick_right' ],
	[ 'left-bumper', 'bumper_left' ],
	[ 'right-bumper', 'bumper_right' ],
	[ 'left-trigger', 'trigger_left' ],
	[ 'right-trigger', 'trigger_right' ],
	[ 'dpad-up', 'dpad_up' ],
	[ 'dpad-down', 'dpad_down' ],
	[ 'dpad-left', 'dpad_left' ],
	[ 'dpad-right', 'dpad_right' ],
];
const DPAD_BUTTONS = [ 'dpad-up', 'dpad-down', 'dpad-left', 'dpad-right' ];

// stick axes, their stick part and the button that presses it
const STICKS = [
	{ x: 'left-x', y: 'left-y', part: 'stick_left', button: 'left-stick' },
	{ x: 'right-x', y: 'right-y', part: 'stick_right', button: 'right-stick' },
];

const TRIGGERS = [
	[ 'left-trigger', 'trigger_left' ],
	[ 'right-trigger', 'trigger_right' ],
];

const _box = new Box3();
const _hinge = new Vector3();
const _force = new Vector3();
const _torque = new Vector3();
const _rotation = new Vector3();
const _axis = new Vector3();

/**
 * @typedef {Object} ControllerModelSettings
 * @property {Vector3} press - Direction into the controller's face, for face buttons, the d-pad and
 * stick presses.
 * @property {Vector3} bumper - Direction bumpers move when pressed.
 * @property {Vector3} trigger - Direction a pulled trigger pushes the controller, for `getTilt`.
 * Triggers themselves swing about their top front edge.
 * @property {boolean} dpadRocks - Whether the d-pad is one piece that rocks toward the pressed
 * direction ( a `dpad` part ) rather than four separate buttons ( `dpad_up` and so on ).
 */

/**
 * A 3D controller whose buttons, triggers, d-pad and sticks move to show a controller's state. Wraps
 * a loaded model with a node per moving part, named by position: `button_south`, `button_east`,
 * `button_west`, `button_north`, `button_select`, `button_start`, `button_home`, `bumper_left` /
 * `right`, `trigger_left` / `right`, `stick_left` / `right` and `dpad`, or `dpad_up` / `down` /
 * `left` / `right`. Sticks tilt about their node's origin, which should be the center of the ball at
 * their base. Use a subclass for a specific controller model.
 * @extends Group
 */
export class ControllerModel extends Group {

	/**
	 * @param {Object3D} scene - The loaded model.
	 * @param {ControllerModelSettings} settings
	 */
	constructor( scene, settings ) {

		super();

		const { press, bumper, trigger, dpadRocks } = settings;
		this.add( scene );

		this._values = {};
		this._buttons = [];
		this._sticks = [];
		this._triggers = [];
		this._right = new Vector3( 1, 0, 0 );
		this._left = new Vector3( - 1, 0, 0 );
		this._down = new Vector3().crossVectors( press, this._right );

		// sticks tilt about their node's origin, the center of the ball at their base
		const pivots = {};
		for ( const { x, y, part: partName, button } of STICKS ) {

			const stick = scene.getObjectByName( partName );
			if ( ! stick ) continue;

			pivots[ button ] = stick;
			this._sticks.push( { x, y, pivot: stick, rest: stick.position.clone() } );

		}

		// triggers swing about a hinge along their top front edge
		scene.updateMatrixWorld( true );
		for ( const [ name, partName ] of TRIGGERS ) {

			const triggerPart = scene.getObjectByName( partName );
			if ( ! triggerPart ) continue;

			_box.setFromObject( triggerPart );
			_hinge.set( ( _box.min.x + _box.max.x ) / 2, _box.max.y, _box.max.z );
			triggerPart.parent.worldToLocal( _hinge );

			const pivot = new Group();
			pivot.position.copy( _hinge );
			triggerPart.parent.add( pivot );
			pivot.add( triggerPart );
			triggerPart.position.sub( pivot.position );

			pivots[ name ] = pivot;
			this._triggers.push( { name, pivot } );

		}

		// each button's part, rest position, and press direction and distance
		for ( const [ name, partName ] of BUTTONS ) {

			const isDpad = DPAD_BUTTONS.includes( name );
			const part = pivots[ name ] || scene.getObjectByName( isDpad && dpadRocks ? 'dpad' : partName );
			if ( ! part ) continue;

			let direction = press;
			let depth = PRESS_DEPTH;
			if ( /trigger/.test( name ) ) {

				direction = trigger;
				depth = 0;

			} else if ( /bumper/.test( name ) ) {

				direction = bumper;

			} else if ( isDpad && dpadRocks ) {

				depth = 0;

			}

			this._values[ name ] = 0;
			this._buttons.push( { name, part, rest: part.position.clone(), direction, depth } );

		}

		// a rocking d-pad turns about the axis that dips the pressed edge into the face
		this._dpad = dpadRocks ? scene.getObjectByName( 'dpad' ) : null;
		this._dpadAxes = {
			'dpad-up': this._right.clone().negate(),
			'dpad-down': this._right.clone(),
			'dpad-left': this._down.clone(),
			'dpad-right': this._down.clone().negate(),
		};

	}

	/**
	 * Shows a button pressed by `value`, from 0 for released to 1 for fully pressed. Analog buttons
	 * like triggers can take values in between. Button names are the same as `GamepadController`'s.
	 * @param {string} name
	 * @param {number} value
	 */
	setButton( name, value ) {

		this._values[ name ] = value;

		const buttons = this._buttons;
		for ( let i = 0, l = buttons.length; i < l; i ++ ) {

			const { name: buttonName, part, rest, direction, depth } = buttons[ i ];
			if ( buttonName === name ) {

				part.position.copy( rest ).addScaledVector( direction, value * depth );

			}

		}

		const triggers = this._triggers;
		for ( let i = 0, l = triggers.length; i < l; i ++ ) {

			if ( triggers[ i ].name === name ) {

				triggers[ i ].pivot.quaternion.setFromAxisAngle( this._left, value * TRIGGER_ANGLE );

			}

		}

		if ( this._dpad && DPAD_BUTTONS.includes( name ) ) {

			_rotation.set( 0, 0, 0 );
			for ( let i = 0, l = DPAD_BUTTONS.length; i < l; i ++ ) {

				const dpadName = DPAD_BUTTONS[ i ];
				_rotation.addScaledVector( this._dpadAxes[ dpadName ], this._values[ dpadName ] );

			}

			rotate( this._dpad, _rotation, DPAD_ANGLE );

		}

	}

	/**
	 * Shows a stick pushed: `left-x`, `left-y`, `right-x` or `right-y`, from -1 to 1 with -1 left or
	 * up, as `GamepadController.getAxis` reports them.
	 * @param {string} name
	 * @param {number} value
	 */
	setAxis( name, value ) {

		this._values[ name ] = value;

		const sticks = this._sticks;
		for ( let i = 0, l = sticks.length; i < l; i ++ ) {

			const { x, y, pivot } = sticks[ i ];
			if ( name === x || name === y ) {

				_rotation.copy( this._right ).multiplyScalar( this._values[ y ] || 0 );
				_rotation.addScaledVector( this._down, - ( this._values[ x ] || 0 ) );
				rotate( pivot, _rotation, STICK_ANGLE );

			}

		}

	}

	/**
	 * Shows a controller's current buttons and sticks.
	 * @param {Controller} controller
	 */
	setFromController( controller ) {

		for ( let i = 0, l = BUTTONS.length; i < l; i ++ ) {

			const name = BUTTONS[ i ][ 0 ];
			this.setButton( name, controller.getAxis( name ) );

		}

		for ( let i = 0, l = STICKS.length; i < l; i ++ ) {

			const { x, y } = STICKS[ i ];
			this.setAxis( x, controller.getAxis( x ) );
			this.setAxis( y, controller.getAxis( y ) );

		}

	}

	/**
	 * Gets the turning force the current presses would apply to the controller, as if each were a
	 * finger pushing at that part. Its direction is the axis to tilt about and its length how much,
	 * e.g. for tilting the model slightly as buttons are pressed.
	 * @param {Vector3} target
	 * @returns {Vector3}
	 */
	getTilt( target ) {

		target.set( 0, 0, 0 );

		const buttons = this._buttons;
		for ( let i = 0, l = buttons.length; i < l; i ++ ) {

			const { name, rest, direction } = buttons[ i ];
			addTorque( target, rest, direction, this._values[ name ] );

		}

		const sticks = this._sticks;
		for ( let i = 0, l = sticks.length; i < l; i ++ ) {

			const { x, y, rest } = sticks[ i ];
			addTorque( target, rest, this._right, this._values[ x ] || 0 );
			addTorque( target, rest, this._down, this._values[ y ] || 0 );

		}

		return target;

	}

}

// adds the turning force of pushing at "position" along "direction"
function addTorque( target, position, direction, amount ) {

	if ( amount === 0 ) return;
	_force.copy( direction ).multiplyScalar( amount );
	_torque.crossVectors( position, _force );
	target.add( _torque );

}

// rotates an object about "rotation" by its length times "scale"
function rotate( object, rotation, scale ) {

	const angle = rotation.length() * scale;
	if ( angle > 0 ) {

		object.quaternion.setFromAxisAngle( _axis.copy( rotation ).normalize(), angle );

	} else {

		object.quaternion.identity();

	}

}

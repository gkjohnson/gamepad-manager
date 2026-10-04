/** @import { Controller } from '../Controller.js' */
import { Box3, Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// how far parts move or rotate when fully pressed
const PRESS_DEPTH = 0.006;
const STICK_ANGLE = 0.35;
const TRIGGER_ANGLE = 0.3;

// directions buttons and bumpers move when pressed
const PRESS = new Vector3( 0, - 1, 0 );
const BUMPER = new Vector3( 0, 0, 1 );

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
 * Base class for the 3D controller models.
 * @category Supporting
 * @extends Group
 */
export class ControllerModel extends Group {

	/**
	 * @param {string|URL} url - The model file.
	 */
	constructor( url ) {

		super();

		/**
		 * Resolves once the model has loaded.
		 * @type {Promise<void>}
		 */
		this.loaded = new GLTFLoader().loadAsync( url.toString() ).then( gltf => {

			if ( this._disposed ) {

				disposeObject( gltf.scene );

			} else {

				this._initParts( gltf.scene );

			}

		} );

		this._disposed = false;

		// direction a pulled trigger tips the controller, set by each subclass
		this._triggerDirection = new Vector3( 0, 1, 0 );

		this._values = {};
		this._buttons = [];
		this._sticks = [];
		this._triggers = [];
		this._right = new Vector3( 1, 0, 0 );
		this._left = new Vector3( - 1, 0, 0 );
		this._down = new Vector3().crossVectors( PRESS, this._right );

	}

	// finds the loaded model's moving parts and adds it
	_initParts( scene ) {

		// sticks tilt about their origin
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
			_hinge.set( ( _box.min.x + _box.max.x ) / 2, _box.max.y, _box.min.z );
			triggerPart.parent.worldToLocal( _hinge );

			const pivot = new Group();
			pivot.position.copy( _hinge );
			triggerPart.parent.add( pivot );
			pivot.add( triggerPart );
			triggerPart.position.sub( pivot.position );

			pivots[ name ] = pivot;
			this._triggers.push( { name, pivot } );

		}

		// each button's part, rest position and press motion
		for ( const [ name, partName ] of BUTTONS ) {

			const part = pivots[ name ] || scene.getObjectByName( partName );
			if ( ! part ) continue;

			let direction = PRESS;
			let depth = PRESS_DEPTH;
			if ( /trigger/.test( name ) ) {

				direction = this._triggerDirection;
				depth = 0;

			} else if ( /bumper/.test( name ) ) {

				direction = BUMPER;

			}

			this._values[ name ] = 0;
			this._buttons.push( { name, part, rest: part.position.clone(), direction, depth } );

		}

		this.add( scene );

	}

	/**
	 * Shows a button pressed, from 0 to 1.
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

	}

	/**
	 * Shows a stick axis pushed, from -1 to 1.
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
				this._rotatePart( pivot, _rotation, STICK_ANGLE );

			}

		}

	}

	/**
	 * Shows a controller's current state.
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
	 * Gets the turning force the current presses apply to the controller, for tilting it slightly.
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

	/**
	 * Frees the model's geometry, materials and textures.
	 */
	dispose() {

		this._disposed = true;
		disposeObject( this );

	}

	// rotates a part about "rotation" by its length times "scale"
	_rotatePart( object, rotation, scale ) {

		const angle = rotation.length() * scale;
		if ( angle > 0 ) {

			object.quaternion.setFromAxisAngle( _axis.copy( rotation ).normalize(), angle );

		} else {

			object.quaternion.identity();

		}

	}

}

// adds the turning force of pushing at "position" along "direction"
function addTorque( target, position, direction, amount ) {

	if ( amount === 0 ) return;
	_force.copy( direction ).multiplyScalar( amount );
	_torque.crossVectors( position, _force );
	target.add( _torque );

}

// frees the geometry, materials and textures of an object and its children
function disposeObject( root ) {

	root.traverse( object => {

		if ( object.geometry ) {

			object.geometry.dispose();

		}

		if ( ! object.material ) {

			return;

		}

		const materials = Array.isArray( object.material ) ? object.material : [ object.material ];
		for ( const material of materials ) {

			for ( const key in material ) {

				const value = material[ key ];
				if ( value && value.isTexture ) {

					value.dispose();
					if ( value.image instanceof ImageBitmap ) {

						value.image.close();

					}

				}

			}

			material.dispose();

		}

	} );

}

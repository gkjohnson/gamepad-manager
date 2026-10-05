/** @import { Controller } from '../core/Controller.js' */
import { Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// how far parts move or turn when fully pressed
const PRESS_DEPTH = 0.006;
const STICK_ANGLE = 0.35;
const TRIGGER_ANGLE = 0.3;

// directions in the models, which lie face up with the sticks along +y and the top edge toward -z
const IN = /* @__PURE__ */ new Vector3( 0, - 1, 0 );
const DOWN = /* @__PURE__ */ new Vector3( 0, 0, 1 );
const LEFT = /* @__PURE__ */ new Vector3( - 1, 0, 0 );

const _rotation = /* @__PURE__ */ new Vector3();
const _force = /* @__PURE__ */ new Vector3();
const _torque = /* @__PURE__ */ new Vector3();

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

		// each button's part, its rest position, the direction it pushes on the controller and how
		// far it's pressed, and each axis's value
		this._buttons = {};
		this._axes = { 'left-x': 0, 'left-y': 0, 'right-x': 0, 'right-y': 0 };
		this._disposed = false;

		/**
		 * Resolves once the model has loaded.
		 * @type {Promise<void>}
		 */
		this.loaded = new GLTFLoader().loadAsync( url.toString() ).then( ( { scene } ) => {

			this.add( scene );
			this._initParts( scene );
			if ( this._disposed ) {

				this.dispose();

			}

		} );

	}

	_initParts( scene ) {

		// each button moves the model part of the same name
		const names = [
			'south', 'east', 'west', 'north', 'select', 'start', 'home',
			'left-stick', 'right-stick', 'left-bumper', 'right-bumper', 'left-trigger', 'right-trigger',
			'dpad-up', 'dpad-down', 'dpad-left', 'dpad-right',
		];

		for ( const name of names ) {

			const object = scene.getObjectByName( name );
			if ( ! object ) {

				continue;

			}

			// bumpers press toward the bottom edge and the rest into the face; how a pulled trigger pushes
			// differs per model, so each model sets its triggers' direction
			let direction = IN;
			if ( name === 'left-bumper' || name === 'right-bumper' ) {

				direction = DOWN;

			} else if ( name === 'left-trigger' || name === 'right-trigger' ) {

				direction = null;

			}

			this._buttons[ name ] = { object, rest: object.position.clone(), direction, value: 0 };

		}

	}

	/**
	 * Shows a button pressed, from 0 to 1.
	 * @param {string} name
	 * @param {number} value
	 */
	setButton( name, value ) {

		const button = this._buttons[ name ];

		button.value = value;
		if ( name === 'left-trigger' || name === 'right-trigger' ) {

			// triggers turn about their hinge, the origin of their node
			button.object.quaternion.setFromAxisAngle( LEFT, value * TRIGGER_ANGLE );

		} else {

			button.object.position.copy( button.rest ).addScaledVector( button.direction, value * PRESS_DEPTH );

		}

	}

	/**
	 * Shows a stick axis pushed, from -1 to 1.
	 * @param {string} name
	 * @param {number} value
	 */
	setAxis( name, value ) {

		const axes = this._axes;
		const buttons = this._buttons;
		axes[ name ] = value;

		// sticks tilt about their origin, the center of the ball at their base: pushing up or down turns
		// them about x, left or right about z
		_rotation.set( axes[ 'left-y' ], 0, - axes[ 'left-x' ] );
		let length = _rotation.length();
		buttons[ 'left-stick' ].object.quaternion.setFromAxisAngle( _rotation.normalize(), length * STICK_ANGLE );

		_rotation.set( axes[ 'right-y' ], 0, - axes[ 'right-x' ] );
		length = _rotation.length();
		buttons[ 'right-stick' ].object.quaternion.setFromAxisAngle( _rotation.normalize(), length * STICK_ANGLE );

	}

	/**
	 * Shows a controller's current state.
	 * @param {Controller} controller
	 */
	setFromController( controller ) {

		for ( const name in this._buttons ) {

			this.setButton( name, controller.getAxis( name ) );

		}

		for ( const name in this._axes ) {

			this.setAxis( name, controller.getAxis( name ) );

		}

	}

	/**
	 * Gets the turning force the current presses apply to the controller, for tilting it slightly.
	 * @param {Vector3} target
	 * @returns {Vector3}
	 */
	getTilt( target ) {

		const axes = this._axes;
		const buttons = this._buttons;
		target.set( 0, 0, 0 );

		// each press pushes on the controller at its part
		for ( const name in buttons ) {

			const { rest, direction, value } = buttons[ name ];
			_force.copy( direction ).multiplyScalar( value );
			target.add( _torque.crossVectors( rest, _force ) );

		}

		// and each stick pushes the way it's tilted
		_force.set( axes[ 'left-x' ], 0, axes[ 'left-y' ] );
		target.add( _torque.crossVectors( buttons[ 'left-stick' ].rest, _force ) );

		_force.set( axes[ 'right-x' ], 0, axes[ 'right-y' ] );
		target.add( _torque.crossVectors( buttons[ 'right-stick' ].rest, _force ) );

		return target;

	}

	/**
	 * Frees the model's geometry, materials and textures.
	 */
	dispose() {

		this._disposed = true;
		this.traverse( object => {

			if ( object.isMesh ) {

				const { geometry, material } = object;
				geometry.dispose();
				material.dispose();

				// the material's textures, whose images are decoded bitmaps
				for ( const key in material ) {

					const value = material[ key ];
					if ( value && value.isTexture ) {

						value.dispose();
						value.image.close();

					}

				}

			}

		} );

	}

}

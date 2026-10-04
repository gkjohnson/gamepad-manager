import { Vector3 } from 'three';
import { ControllerModel } from './ControllerModel.js';

const MODEL_URL = new URL( './models/xbox-controller.glb', import.meta.url );
const DPAD_ANGLE = 0.12;
const DPAD_BUTTONS = [ 'dpad-up', 'dpad-down', 'dpad-left', 'dpad-right' ];
const PRESS = new Vector3( 0, - 1, 0 );

const _rotation = new Vector3();

/**
 * An Xbox controller model.
 * @extends ControllerModel
 */
export class XboxControllerModel extends ControllerModel {

	constructor() {

		super( MODEL_URL );
		this._triggerDirection.set( 0, 0.66, 0.75 ).normalize();

		this._dpad = null;
		this._dpadAxes = {
			'dpad-up': this._right.clone().negate(),
			'dpad-down': this._right.clone(),
			'dpad-left': this._down.clone(),
			'dpad-right': this._down.clone().negate(),
		};

	}

	_initParts( scene ) {

		super._initParts( scene );

		// the d-pad is one piece that rocks toward the pressed direction
		this._dpad = scene.getObjectByName( 'dpad' );
		for ( const name of DPAD_BUTTONS ) {

			this._values[ name ] = 0;
			this._buttons.push( { name, part: this._dpad, rest: this._dpad.position.clone(), direction: PRESS, depth: 0 } );

		}

	}

	setButton( name, value ) {

		super.setButton( name, value );

		if ( this._dpad && DPAD_BUTTONS.includes( name ) ) {

			_rotation.set( 0, 0, 0 );
			for ( let i = 0, l = DPAD_BUTTONS.length; i < l; i ++ ) {

				const dpadName = DPAD_BUTTONS[ i ];
				_rotation.addScaledVector( this._dpadAxes[ dpadName ], this._values[ dpadName ] );

			}

			this._rotatePart( this._dpad, _rotation, DPAD_ANGLE );

		}

	}

}

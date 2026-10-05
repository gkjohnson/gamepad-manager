import { Vector3 } from 'three';
import { ControllerModel } from './ControllerModel.js';

const MODEL_URL = new URL( './models/xbox-controller.glb', import.meta.url );

// how far the d-pad rocks when fully pressed
const DPAD_ANGLE = 0.12;

const _rotation = /* @__PURE__ */ new Vector3();

/**
 * An Xbox controller model.
 * @extends ControllerModel
 */
export class XboxControllerModel extends ControllerModel {

	constructor() {

		super( MODEL_URL );

	}

	_initParts( scene ) {

		super._initParts( scene );

		// a pulled trigger pushes the controller up and toward its bottom edge
		const push = new Vector3( 0, 0.66, 0.75 ).normalize();
		this._buttons[ 'left-trigger' ].direction = push;
		this._buttons[ 'right-trigger' ].direction = push;

		// all four d-pad buttons are the one d-pad part, pushing into the face
		const dpad = scene.getObjectByName( 'dpad' );
		const press = new Vector3( 0, - 1, 0 );
		for ( const name of [ 'dpad-up', 'dpad-down', 'dpad-left', 'dpad-right' ] ) {

			this._buttons[ name ] = {
				object: dpad,
				rest: dpad.position.clone(),
				direction: press,
				value: 0,
			};

		}

	}

	setButton( name, value ) {

		const buttons = this._buttons;
		if ( ! name.startsWith( 'dpad-' ) ) {

			super.setButton( name, value );
			return;

		}

		// the d-pad is one piece that rocks toward the pressed directions: up and down turn it about x,
		// left and right about z
		buttons[ name ].value = value;
		_rotation.set(
			buttons[ 'dpad-down' ].value - buttons[ 'dpad-up' ].value,
			0,
			buttons[ 'dpad-left' ].value - buttons[ 'dpad-right' ].value,
		);
		const length = _rotation.length();
		buttons[ name ].object.quaternion.setFromAxisAngle( _rotation.normalize(), length * DPAD_ANGLE );

	}

}

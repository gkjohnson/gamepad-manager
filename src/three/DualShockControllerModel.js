import { Vector3 } from 'three';
import { ControllerModel } from './ControllerModel.js';

const MODEL_URL = new URL( './models/dualshock-controller.glb', import.meta.url );

/**
 * A PlayStation DualShock 4 controller model.
 * @extends ControllerModel
 */
export class DualShockControllerModel extends ControllerModel {

	constructor() {

		super( MODEL_URL );

	}

	_initParts( scene ) {

		super._initParts( scene );

		// a pulled trigger pushes the controller up and toward its bottom edge
		const push = new Vector3( 0, 1, 0.5 ).normalize();
		this._buttons[ 'left-trigger' ].direction = push;
		this._buttons[ 'right-trigger' ].direction = push;

	}

}

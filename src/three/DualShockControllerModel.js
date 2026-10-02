/** @import { Object3D } from 'three' */
import { Vector3 } from 'three';
import { ControllerModel } from './ControllerModel.js';

const PRESS = new Vector3( 0, 0, - 1 );
const BUMPER = new Vector3( 0, - 1, 0 );
const TRIGGER = new Vector3( 0, - 0.5, 1 ).normalize();

/**
 * A PlayStation DualShock 4 controller model, for `example/models/dualshock-controller.glb`. Its
 * d-pad is four separate buttons.
 * @extends ControllerModel
 */
export class DualShockControllerModel extends ControllerModel {

	/**
	 * @param {Object3D} scene - The loaded model.
	 */
	constructor( scene ) {

		super( scene, {
			press: PRESS,
			bumper: BUMPER,
			trigger: TRIGGER,
			dpadRocks: false,
		} );

	}

}

/** @import { Object3D } from 'three' */
import { Vector3 } from 'three';
import { ControllerModel } from './ControllerModel.js';

// the model's face is tilted like the Xbox model's, so its "into the face" and "down toward the
// grips" aren't axis aligned
const PRESS = new Vector3( 0, - 0.75, - 0.66 ).normalize();
const BUMPER = new Vector3( 0, - 0.66, 0.75 ).normalize();
const TRIGGER = new Vector3( 0, 0.42, 1.04 ).normalize();

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

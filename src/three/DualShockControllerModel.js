/** @import { Object3D } from 'three' */
import { ControllerModel } from './ControllerModel.js';

/**
 * A PlayStation DualShock 4 controller model, for `example/models/dualshock-controller.glb`.
 * @extends ControllerModel
 */
export class DualShockControllerModel extends ControllerModel {

	/**
	 * @param {Object3D} scene - The loaded model.
	 */
	constructor( scene ) {

		super( scene );
		this._triggerDirection.set( 0, 1, 0.5 ).normalize();

	}

}

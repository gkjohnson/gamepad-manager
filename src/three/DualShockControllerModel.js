import { ControllerModel } from './ControllerModel.js';

const MODEL_URL = new URL( './models/dualshock-controller.glb', import.meta.url );

/**
 * A PlayStation DualShock 4 controller model.
 * @extends ControllerModel
 */
export class DualShockControllerModel extends ControllerModel {

	constructor() {

		super( MODEL_URL );
		this._triggerDirection.set( 0, 1, 0.5 ).normalize();

	}

}

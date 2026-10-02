/** @import { Object3D } from 'three' */
import { Vector3 } from 'three';
import { ControllerModel } from './ControllerModel.js';

const PRESS = new Vector3( 0, - 1, 0 );
const BUMPER = new Vector3( 0, 0, 1 );
const TRIGGER = new Vector3( 0, 0.66, 0.75 ).normalize();

/**
 * An Xbox controller model, for `example/models/xbox-controller.glb`. Its d-pad is one piece that
 * rocks toward the pressed direction.
 * @extends ControllerModel
 */
export class XboxControllerModel extends ControllerModel {

	/**
	 * @param {Object3D} scene - The loaded model.
	 */
	constructor( scene ) {

		super( scene, {
			press: PRESS,
			bumper: BUMPER,
			trigger: TRIGGER,
			dpadRocks: true,
		} );

	}

}

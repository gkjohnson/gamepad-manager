import { Controller } from './Controller.js';

// button and axis names for the browser's "standard" mapping, by position on the controller
const STANDARD_BUTTONS = [
	'south', 'east', 'west', 'north',
	'left-bumper', 'right-bumper', 'left-trigger', 'right-trigger',
	'select', 'start', 'left-stick', 'right-stick',
	'dpad-up', 'dpad-down', 'dpad-left', 'dpad-right',
	'home',
];
const STANDARD_AXES = [ 'left-x', 'left-y', 'right-x', 'right-y' ];

// brands by their USB vendor id or name in the browser's gamepad id, which varies by browser
const BRANDS = [
	[ 'xbox', /045e|xbox|xinput/i ],
	[ 'playstation', /054c|playstation|dualshock|dualsense/i ],
	[ 'switch', /057e|nintendo|pro controller|joy-con/i ],
];

/**
 * @typedef {Object} GamepadFeatures
 * @property {string} mapping - The browser's mapping: `'standard'`, or `''` when the controller
 * isn't recognized and buttons and axes are only numbered.
 * @property {number} buttons - Number of buttons.
 * @property {number} axes - Number of axes.
 * @property {boolean} rumble - Whether the browser exposes a vibration actuator.
 */

/**
 * Fired when a gamepad connects to this controller, before the manager's `connected` event.
 * @event GamepadController#connected
 */

/**
 * Fired when the gamepad disconnects, after its held buttons are released, and before the
 * manager's `disconnected` event.
 * @event GamepadController#disconnected
 */

/**
 * A gamepad. With the browser's `'standard'` mapping buttons are named by position: the face buttons
 * `south`, `east`, `west` and `north` ( A, B, X, Y on Xbox ), then `left-bumper`, `right-bumper`,
 * `left-trigger`, `right-trigger`, `select`, `start`, `left-stick`, `right-stick`, `dpad-up`,
 * `dpad-down`, `dpad-left`, `dpad-right` and `home`, and axes `left-x`, `left-y`, `right-x` and
 * `right-y`. Otherwise they're named `button-0`, `axis-0` and so on.
 *
 * Created by `ControllerManager`, and kept in its slot across disconnects so references stay valid.
 * @extends Controller
 */
export class GamepadController extends Controller {

	constructor() {

		super( 'gamepad' );

		/**
		 * The browser's id for the controller model, e.g. its product name. Kept after disconnecting.
		 * @type {string}
		 */
		this.id = '';

		/**
		 * The controller's brand, guessed from `id`: `'xbox'`, `'playstation'`, `'switch'`, or `''`
		 * when unknown. Many third-party controllers report themselves as Xbox controllers.
		 * @type {string}
		 */
		this.brand = '';

		/**
		 * The browser's index for the connected gamepad, or -1.
		 * @type {number}
		 */
		this.index = - 1;

		/**
		 * What the connected gamepad exposes.
		 * @type {GamepadFeatures}
		 */
		this.features = { mapping: '', buttons: 0, axes: 0, rumble: false };

		/**
		 * Stick values under this distance from center read as 0, and values beyond it are rescaled to
		 * start from 0. Applied to each stick's x and y together.
		 * @type {number}
		 */
		this.deadZone = 0.1;

		this._buttonNames = [];
		this._axisNames = [];
		this._connectionEvent = { type: '', target: null };

	}

	/**
	 * Starts tracking a gamepad. Called by `ControllerManager`.
	 * @private
	 * @param {Gamepad} gamepad
	 */
	connect( gamepad ) {

		const { features } = this;
		this.id = gamepad.id;
		this.brand = '';
		for ( const [ brand, pattern ] of BRANDS ) {

			if ( pattern.test( gamepad.id ) ) {

				this.brand = brand;
				break;

			}

		}

		this.index = gamepad.index;
		this.connected = true;
		features.mapping = gamepad.mapping;
		features.buttons = gamepad.buttons.length;
		features.axes = gamepad.axes.length;
		features.rumble = Boolean( gamepad.vibrationActuator );

		const standard = gamepad.mapping === 'standard';
		this._buttonNames.length = 0;
		for ( let i = 0; i < features.buttons; i ++ ) {

			this._buttonNames.push( standard && i < STANDARD_BUTTONS.length ? STANDARD_BUTTONS[ i ] : `button-${ i }` );

		}

		this._axisNames.length = 0;
		for ( let i = 0; i < features.axes; i ++ ) {

			this._axisNames.push( standard && i < STANDARD_AXES.length ? STANDARD_AXES[ i ] : `axis-${ i }` );

		}

		this._buttons.clear();
		this._axes.clear();

		this._connectionEvent.type = 'connected';
		this.dispatchEvent( this._connectionEvent );

	}

	/**
	 * Releases held buttons, centers the axes and stops tracking the gamepad. Called by
	 * `ControllerManager`.
	 * @private
	 */
	disconnect() {

		this._releaseAll();
		this.connected = false;
		this.index = - 1;

		this._connectionEvent.type = 'disconnected';
		this.dispatchEvent( this._connectionEvent );

	}

	/**
	 * Reads the gamepad's buttons and axes and fires events for buttons that changed. Called by
	 * `ControllerManager.update`.
	 * @private
	 * @param {Gamepad} gamepad - The gamepad's current state, from `navigator.getGamepads()` this
	 * frame. Don't keep `Gamepad` objects between frames.
	 */
	update( gamepad ) {

		if ( ! this.connected || ! gamepad ) return;

		const { buttons, axes } = gamepad;
		const buttonNames = this._buttonNames;
		const axisNames = this._axisNames;
		for ( let i = 0, l = buttonNames.length; i < l; i ++ ) {

			this._setButton( buttonNames[ i ], buttons[ i ].value );

		}

		// sticks get a radial dead zone over each x / y pair, other axes one per axis
		const pairs = this.features.mapping === 'standard' ? 4 : 0;
		for ( let i = 0; i < pairs; i += 2 ) {

			const x = axes[ i ];
			const y = axes[ i + 1 ];
			const scale = this._deadZoneScale( Math.hypot( x, y ) );
			this._setAxis( axisNames[ i ], x * scale );
			this._setAxis( axisNames[ i + 1 ], y * scale );

		}

		for ( let i = pairs, l = axisNames.length; i < l; i ++ ) {

			const value = axes[ i ];
			this._setAxis( axisNames[ i ], value * this._deadZoneScale( Math.abs( value ) ) );

		}

	}

	// factor that maps a magnitude past the dead zone back onto 0 to 1
	_deadZoneScale( magnitude ) {

		const { deadZone } = this;
		if ( magnitude <= deadZone ) return 0;
		return Math.min( ( magnitude - deadZone ) / ( 1 - deadZone ), 1 ) / magnitude;

	}

}

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

// button names for each standard axis's negative and positive directions
const STANDARD_AXIS_BUTTONS = [
	[ 'left-stick-left', 'left-stick-right' ],
	[ 'left-stick-up', 'left-stick-down' ],
	[ 'right-stick-left', 'right-stick-right' ],
	[ 'right-stick-up', 'right-stick-down' ],
];

// brands by their USB vendor id or name in the browser's gamepad id, which varies by browser. Safari
// writes vendor ids without the leading zero
const BRANDS = [
	[ 'xbox', /\b0?45e\b|xbox|xinput/i ],
	[ 'playstation', /\b0?54c\b|playstation|dualshock|dualsense/i ],
	[ 'nintendo', /\b0?57e\b|nintendo|pro controller|joy-con/i ],
];

// printed names of the standard buttons for each brand
const DIRECTION_NAMES = {
	'dpad-up': 'D-pad Up',
	'dpad-down': 'D-pad Down',
	'dpad-left': 'D-pad Left',
	'dpad-right': 'D-pad Right',
	'left-stick-up': 'Left Stick Up',
	'left-stick-down': 'Left Stick Down',
	'left-stick-left': 'Left Stick Left',
	'left-stick-right': 'Left Stick Right',
	'right-stick-up': 'Right Stick Up',
	'right-stick-down': 'Right Stick Down',
	'right-stick-left': 'Right Stick Left',
	'right-stick-right': 'Right Stick Right',
};

const BUTTON_NAMES = {
	xbox: {
		...DIRECTION_NAMES,
		'south': 'A',
		'east': 'B',
		'west': 'X',
		'north': 'Y',
		'left-bumper': 'LB',
		'right-bumper': 'RB',
		'left-trigger': 'LT',
		'right-trigger': 'RT',
		'select': 'View',
		'start': 'Menu',
		'left-stick': 'LS',
		'right-stick': 'RS',
		'home': 'Guide',
	},
	playstation: {
		...DIRECTION_NAMES,
		'south': 'Cross',
		'east': 'Circle',
		'west': 'Square',
		'north': 'Triangle',
		'left-bumper': 'L1',
		'right-bumper': 'R1',
		'left-trigger': 'L2',
		'right-trigger': 'R2',
		'select': 'Create',
		'start': 'Options',
		'left-stick': 'L3',
		'right-stick': 'R3',
		'home': 'PS',
	},
	nintendo: {
		...DIRECTION_NAMES,
		'south': 'B',
		'east': 'A',
		'west': 'Y',
		'north': 'X',
		'left-bumper': 'L',
		'right-bumper': 'R',
		'left-trigger': 'ZL',
		'right-trigger': 'ZR',
		'select': '-',
		'start': '+',
		'left-stick': 'L Stick',
		'right-stick': 'R Stick',
		'home': 'Home',
	},
};

/**
 * @typedef {Object} GamepadFeatures
 * @property {string} mapping - The browser's mapping: `'standard'`, or `''` when the controller
 * isn't recognized and buttons and axes are only numbered.
 * @property {number} buttons - Number of buttons.
 * @property {number} axes - Number of axes.
 * @property {boolean} rumble - Whether the gamepad supports the `'dual-rumble'` effect. Browsers
 * without a list of supported effects, like Safari, report true whenever they expose a vibration
 * actuator.
 * @property {boolean} triggerRumble - Whether the gamepad supports the `'trigger-rumble'` effect,
 * the motors in the triggers of Xbox controllers.
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
 * Each axis direction is also a button, held past `pressThreshold` like a trigger: `left-stick-up`,
 * `left-stick-down`, `left-stick-left`, `left-stick-right` and the same for `right-stick`, or
 * `axis-0-negative`, `axis-0-positive` and so on without the `'standard'` mapping.
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
		 * The controller's brand, guessed from `id`: `'xbox'`, `'playstation'`, `'nintendo'`, or `''`
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
		this.features = { mapping: '', buttons: 0, axes: 0, rumble: false, triggerRumble: false };

		/**
		 * Stick values under this distance from center read as 0, and values beyond it are rescaled to
		 * start from 0. Applied to each stick's x and y together.
		 * @type {number}
		 */
		this.deadZone = 0.1;

		this._buttonNames = [];
		this._axisNames = [];
		this._axisNegativeNames = [];
		this._axisPositiveNames = [];
		this._connectionEvent = { type: '', target: null };

	}

	/**
	 * Returns the name printed on the controller for a button, e.g. `'A'` for `south` on Xbox and
	 * `'Cross'` on PlayStation. Unknown brands get the Xbox names, and controllers without the
	 * `'standard'` mapping get `name` back.
	 * @param {string} name
	 * @returns {string}
	 */
	getButtonName( name ) {

		if ( this.features.mapping !== 'standard' ) return name;

		const names = BUTTON_NAMES[ this.brand ] || BUTTON_NAMES.xbox;
		return names[ name ] || name;

	}

	/**
	 * Plays a rumble effect through the gamepad's `vibrationActuator.playEffect`. Check
	 * `features.rumble` and `features.triggerRumble` for support.
	 * @param {string} type - `'dual-rumble'` or `'trigger-rumble'`.
	 * @param {Object} [params] - The effect's `duration` and `startDelay` in milliseconds, and
	 * `strongMagnitude`, `weakMagnitude`, `leftTrigger` and `rightTrigger` from 0 to 1.
	 * @returns {Promise<string>|null} Resolves `'complete'`, or `'preempted'` when another effect
	 * replaces it. Null when the gamepad isn't connected or can't rumble.
	 */
	rumble( type, params ) {

		const gamepad = this.connected ? navigator.getGamepads()[ this.index ] : null;
		if ( ! gamepad || ! gamepad.vibrationActuator ) return null;

		return gamepad.vibrationActuator.playEffect( type, params );

	}

	/**
	 * Stops the current rumble effect through the gamepad's `vibrationActuator.reset`. The stopped
	 * effect's promise resolves `'preempted'`.
	 * @returns {Promise<string>|null} Resolves `'complete'`. Null when the gamepad isn't connected or
	 * can't rumble.
	 */
	stopRumble() {

		const gamepad = this.connected ? navigator.getGamepads()[ this.index ] : null;
		if ( ! gamepad || ! gamepad.vibrationActuator ) return null;

		return gamepad.vibrationActuator.reset();

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

		// only Chrome lists the supported effects, so otherwise assume dual rumble with an actuator
		const actuator = gamepad.vibrationActuator;
		const effects = actuator && actuator.effects;
		features.rumble = effects ? effects.includes( 'dual-rumble' ) : Boolean( actuator );
		features.triggerRumble = effects ? effects.includes( 'trigger-rumble' ) : false;

		const standard = gamepad.mapping === 'standard';
		this._buttonNames.length = 0;
		for ( let i = 0; i < features.buttons; i ++ ) {

			this._buttonNames.push( standard && i < STANDARD_BUTTONS.length ? STANDARD_BUTTONS[ i ] : `button-${ i }` );

		}

		this._axisNames.length = 0;
		this._axisNegativeNames.length = 0;
		this._axisPositiveNames.length = 0;
		for ( let i = 0; i < features.axes; i ++ ) {

			const named = standard && i < STANDARD_AXES.length;
			this._axisNames.push( named ? STANDARD_AXES[ i ] : `axis-${ i }` );
			this._axisNegativeNames.push( named ? STANDARD_AXIS_BUTTONS[ i ][ 0 ] : `axis-${ i }-negative` );
			this._axisPositiveNames.push( named ? STANDARD_AXIS_BUTTONS[ i ][ 1 ] : `axis-${ i }-positive` );

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

		// each axis direction as a button
		const negativeNames = this._axisNegativeNames;
		const positiveNames = this._axisPositiveNames;
		for ( let i = 0, l = axisNames.length; i < l; i ++ ) {

			const value = this._axes.get( axisNames[ i ] );
			this._setButton( negativeNames[ i ], Math.max( - value, 0 ) );
			this._setButton( positiveNames[ i ], Math.max( value, 0 ) );

		}

	}

	// factor that maps a magnitude past the dead zone back onto 0 to 1
	_deadZoneScale( magnitude ) {

		const { deadZone } = this;
		if ( magnitude <= deadZone ) return 0;
		return Math.min( ( magnitude - deadZone ) / ( 1 - deadZone ), 1 ) / magnitude;

	}

}

import { Controller } from './Controller.js';

// button and axis names for the "standard" mapping
const STANDARD_BUTTONS = [
	'south', 'east', 'west', 'north',
	'left-bumper', 'right-bumper', 'left-trigger', 'right-trigger',
	'select', 'start', 'left-stick', 'right-stick',
	'dpad-up', 'dpad-down', 'dpad-left', 'dpad-right',
	'home',
];
const STANDARD_AXES = [ 'left-x', 'left-y', 'right-x', 'right-y' ];

// button names for each axis's negative and positive directions
const STANDARD_AXIS_BUTTONS = [
	[ 'left-stick-left', 'left-stick-right' ],
	[ 'left-stick-up', 'left-stick-down' ],
	[ 'right-stick-left', 'right-stick-right' ],
	[ 'right-stick-up', 'right-stick-down' ],
];

// brands by USB vendor id or name, with or without the leading zero
const BRANDS = [
	[ 'xbox', /\b0?45e\b|xbox|xinput/i ],
	[ 'playstation', /\b0?54c\b|playstation|dualshock|dualsense/i ],
	[ 'nintendo', /\b0?57e\b|nintendo|pro controller|joy-con/i ],
];

// printed button names for each brand
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
 * @category Supporting
 * @property {string} mapping - `'standard'`, or `''` when the controller isn't recognized.
 * @property {number} buttons - Number of buttons.
 * @property {number} axes - Number of axes.
 * @property {boolean} rumble - Whether `'dual-rumble'` is supported.
 * @property {boolean} triggerRumble - Whether `'trigger-rumble'` is supported.
 */

/**
 * Fired when the gamepad connects.
 * @event GamepadController#connected
 */

/**
 * Fired when the gamepad disconnects.
 * @event GamepadController#disconnected
 */

/**
 * A gamepad, with buttons and axes named by position, like `south` and `left-x`. See the README for
 * the full list.
 * @extends Controller
 */
export class GamepadController extends Controller {

	constructor() {

		super( 'gamepad' );

		/**
		 * The browser's id for the controller model.
		 * @type {string}
		 */
		this.id = '';

		/**
		 * `'xbox'`, `'playstation'`, `'nintendo'`, or `''` when unknown.
		 * @type {string}
		 */
		this.brand = '';

		/**
		 * The controller's slot in the manager, or -1 once removed by `reassignSlots`.
		 * @type {number}
		 */
		this.slot = - 1;

		/**
		 * What the connected gamepad exposes.
		 * @type {GamepadFeatures}
		 */
		this.features = { mapping: '', buttons: 0, axes: 0, rumble: false, triggerRumble: false };

		/**
		 * Stick values under this distance from center read as 0.
		 * @type {number}
		 */
		this.deadZone = 0.1;

		// the browser's gamepad index
		this._index = - 1;
		this._buttonNames = [];
		this._axisNames = [];
		this._axisNegativeNames = [];
		this._axisPositiveNames = [];
		this._connectionEvent = { type: '', target: null };

	}

	/**
	 * The name printed on the controller for a button, e.g. `'A'` or `'Cross'`. Xbox names for
	 * unknown brands.
	 * @param {string} name
	 * @returns {string}
	 */
	getButtonName( name ) {

		if ( this.features.mapping !== 'standard' ) return name;

		const names = BUTTON_NAMES[ this.brand ] || BUTTON_NAMES.xbox;
		return names[ name ] || name;

	}

	/**
	 * Plays a rumble effect through `vibrationActuator.playEffect`. Returns null if unsupported.
	 * @param {string} type - `'dual-rumble'` or `'trigger-rumble'`.
	 * @param {Object} [params] - The `playEffect` parameters.
	 * @returns {Promise<string>|null}
	 */
	rumble( type, params ) {

		const gamepad = this.connected ? navigator.getGamepads()[ this._index ] : null;
		if ( ! gamepad || ! gamepad.vibrationActuator ) return null;

		return gamepad.vibrationActuator.playEffect( type, params );

	}

	/**
	 * Stops the current rumble effect. Returns null if unsupported.
	 * @returns {Promise<string>|null}
	 */
	stopRumble() {

		const gamepad = this.connected ? navigator.getGamepads()[ this._index ] : null;
		if ( ! gamepad || ! gamepad.vibrationActuator ) return null;

		return gamepad.vibrationActuator.reset();

	}

	/**
	 * Starts tracking a gamepad.
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

		this._index = gamepad.index;
		this.connected = true;
		features.mapping = gamepad.mapping;
		features.buttons = gamepad.buttons.length;
		features.axes = gamepad.axes.length;

		// only Chrome lists the supported effects
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
	 * Releases everything and stops tracking the gamepad.
	 * @private
	 */
	disconnect() {

		this._releaseAll();
		this.connected = false;
		this._index = - 1;

		this._connectionEvent.type = 'disconnected';
		this.dispatchEvent( this._connectionEvent );

	}

	/**
	 * Reads the gamepad's buttons and axes.
	 * @private
	 * @param {Gamepad} gamepad - This frame's state from `navigator.getGamepads()`.
	 */
	update( gamepad ) {

		if ( ! this.connected || ! gamepad ) return;

		const { buttons, axes } = gamepad;
		const buttonNames = this._buttonNames;
		const axisNames = this._axisNames;
		for ( let i = 0, l = buttonNames.length; i < l; i ++ ) {

			this._setButton( buttonNames[ i ], buttons[ i ].value );

		}

		// sticks get a radial dead zone, other axes one per axis
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

	// rescales a magnitude past the dead zone to 0 to 1
	_deadZoneScale( magnitude ) {

		const { deadZone } = this;
		if ( magnitude <= deadZone ) return 0;
		return Math.min( ( magnitude - deadZone ) / ( 1 - deadZone ), 1 ) / magnitude;

	}

}

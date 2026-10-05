import { Controller } from './Controller.js';

// button and axis names for the "standard" mapping
const STANDARD_BUTTONS = [
	'south', 'east', 'west', 'north',
	'left-bumper', 'right-bumper', 'left-trigger', 'right-trigger',
	'select', 'start', 'left-stick', 'right-stick',
	'dpad-up', 'dpad-down', 'dpad-left', 'dpad-right',
	'home',
];
// each axis, with the buttons for its negative and positive directions
const STANDARD_AXES = [
	{ name: 'left-x', negative: 'left-stick-left', positive: 'left-stick-right' },
	{ name: 'left-y', negative: 'left-stick-up', positive: 'left-stick-down' },
	{ name: 'right-x', negative: 'right-stick-left', positive: 'right-stick-right' },
	{ name: 'right-y', negative: 'right-stick-up', positive: 'right-stick-down' },
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
 * Fired when the gamepad connects.
 * @event GamepadController#connected
 */

/**
 * Fired when the gamepad disconnects.
 * @event GamepadController#disconnected
 */

/**
 * A gamepad, with buttons and axes named by position. Buttons are `south`, `east`, `west`, `north`,
 * `left-bumper`, `right-bumper`, `left-trigger`, `right-trigger`, `select`, `start`, `left-stick`,
 * `right-stick`, `dpad-up`, `dpad-down`, `dpad-left`, `dpad-right` and `home`, plus each stick
 * direction, like `left-stick-up`. Axes are `left-x`, `left-y`, `right-x` and `right-y`. Gamepads
 * without the `'standard'` mapping get `button-0`, `axis-0` and so on.
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
		 * The browser's mapping: `'standard'`, or `''` when the controller isn't recognized.
		 * @type {string}
		 */
		this.mapping = '';

		/**
		 * Whether `rumble` supports `'dual-rumble'`.
		 * @type {boolean}
		 */
		this.hasRumble = false;

		/**
		 * Whether `rumble` supports `'trigger-rumble'`.
		 * @type {boolean}
		 */
		this.hasTriggerRumble = false;

		/**
		 * Stick values under this distance from center read as 0.
		 * @type {number}
		 */
		this.deadZone = 0.1;

		// the browser's gamepad index
		this._index = - 1;
		this._buttonNames = [];

		// each axis's name and its direction buttons' names, in the browser's axis order
		this._axisNames = [];

	}

	/**
	 * The name printed on the controller for a button, e.g. `'A'` or `'Cross'`. Xbox names for
	 * unknown brands.
	 * @param {string} name
	 * @returns {string}
	 */
	getButtonName( name ) {

		if ( this.mapping !== 'standard' ) {

			return name;

		}

		const names = BUTTON_NAMES[ this.brand ] || BUTTON_NAMES.xbox;
		return names[ name ] || name;

	}

	/**
	 * Plays a rumble effect through `vibrationActuator.playEffect`. Check `hasRumble` first.
	 * @param {string} type - `'dual-rumble'` or `'trigger-rumble'`.
	 * @param {Object} [params] - The `playEffect` parameters.
	 * @returns {Promise<string>}
	 */
	rumble( type, params ) {

		return navigator.getGamepads()[ this._index ].vibrationActuator.playEffect( type, params );

	}

	/**
	 * Stops the current rumble effect.
	 * @returns {Promise<string>}
	 */
	stopRumble() {

		return navigator.getGamepads()[ this._index ].vibrationActuator.reset();

	}

	/**
	 * Starts tracking a gamepad.
	 * @private
	 * @param {Gamepad} gamepad
	 */
	connect( gamepad ) {

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
		this.mapping = gamepad.mapping;

		// only Chrome lists the supported effects
		const actuator = gamepad.vibrationActuator;
		const effects = actuator && actuator.effects;
		this.hasRumble = effects ? effects.includes( 'dual-rumble' ) : Boolean( actuator );
		this.hasTriggerRumble = effects ? effects.includes( 'trigger-rumble' ) : false;

		const standard = gamepad.mapping === 'standard';
		this._buttonNames.length = 0;
		for ( let i = 0; i < gamepad.buttons.length; i ++ ) {

			this._buttonNames.push( standard && i < STANDARD_BUTTONS.length ? STANDARD_BUTTONS[ i ] : `button-${ i }` );

		}

		this._axisNames.length = 0;
		for ( let i = 0; i < gamepad.axes.length; i ++ ) {

			if ( standard && i < STANDARD_AXES.length ) {

				this._axisNames.push( STANDARD_AXES[ i ] );

			} else {

				this._axisNames.push( { name: `axis-${ i }`, negative: `axis-${ i }-negative`, positive: `axis-${ i }-positive` } );

			}

		}

		this._buttons.clear();
		this._axes.clear();
		this._dispatch( 'connected', '' );

	}

	/**
	 * Releases everything and stops tracking the gamepad.
	 * @private
	 */
	disconnect() {

		this._releaseAll();
		this.connected = false;
		this._index = - 1;
		this._dispatch( 'disconnected', '' );

	}

	/**
	 * Reads the gamepad's buttons and axes.
	 * @private
	 * @param {Gamepad} gamepad - This frame's state from `navigator.getGamepads()`.
	 * @returns {boolean} Whether a button was pressed or an axis moved.
	 */
	update( gamepad ) {

		this._used = false;

		const { buttons, axes } = gamepad;
		const buttonNames = this._buttonNames;
		const axisNames = this._axisNames;
		for ( let i = 0, l = buttonNames.length; i < l; i ++ ) {

			this._setButton( buttonNames[ i ], buttons[ i ].value );

		}

		// sticks get a radial dead zone, other axes one per axis
		const pairs = this.mapping === 'standard' ? 4 : 0;
		for ( let i = 0; i < pairs; i += 2 ) {

			const x = axes[ i ];
			const y = axes[ i + 1 ];
			const scale = this._deadZoneScale( Math.hypot( x, y ) );
			this._setAxis( axisNames[ i ].name, x * scale );
			this._setAxis( axisNames[ i + 1 ].name, y * scale );

		}

		for ( let i = pairs, l = axisNames.length; i < l; i ++ ) {

			const value = axes[ i ];
			this._setAxis( axisNames[ i ].name, value * this._deadZoneScale( Math.abs( value ) ) );

		}

		// each axis direction as a button
		for ( let i = 0, l = axisNames.length; i < l; i ++ ) {

			const { name, negative, positive } = axisNames[ i ];
			const value = this._axes.get( name );
			this._setButton( negative, Math.max( - value, 0 ) );
			this._setButton( positive, Math.max( value, 0 ) );

		}

		return this._used;

	}

	// rescales a magnitude past the dead zone to 0 to 1
	_deadZoneScale( magnitude ) {

		const { deadZone } = this;
		if ( magnitude <= deadZone ) {

			return 0;

		}

		return Math.min( ( magnitude - deadZone ) / ( 1 - deadZone ), 1 ) / magnitude;

	}

}

import { EventDispatcher } from './EventDispatcher.js';

/**
 * Fired during `update` when a button goes down. The event object is reused, so copy any fields to
 * keep.
 * @event Controller#pressed
 * @property {string} name - The button's name.
 */

/**
 * Fired during `update` when a button goes up. The event object is reused, so copy any fields to
 * keep.
 * @event Controller#released
 * @property {string} name - The button's name.
 */

/**
 * Base class for an input device: named buttons and axes, queried after each `update` or listened
 * to through events. Buttons are either held or not; how far an analog button is pressed is read
 * with `getAxis`. Controllers are created by `ControllerManager`.
 * @extends EventDispatcher
 */
export class Controller extends EventDispatcher {

	// type: 'gamepad', 'keyboard' or 'mouse'
	constructor( type ) {

		super();

		/**
		 * The kind of device: `'gamepad'`, `'keyboard'` or `'mouse'`.
		 * @type {string}
		 */
		this.type = type;

		/**
		 * Whether the device is available. Always true for the keyboard and mouse.
		 * @type {boolean}
		 */
		this.connected = false;

		/**
		 * How far an analog button, such as a trigger, must be pressed to count as held.
		 * @type {number}
		 */
		this.pressThreshold = 0.5;

		/**
		 * How far a held analog button must come back to count as released. Lower than
		 * `pressThreshold` so a trigger resting near it doesn't flicker.
		 * @type {number}
		 */
		this.releaseThreshold = 0.4;

		this._buttons = new Map();
		this._axes = new Map();
		this._event = { type: '', name: '', target: null };

	}

	/**
	 * Whether the button is down. True on every update while held, including the one it went down.
	 * Analog buttons count as held from `pressThreshold` until they drop below `releaseThreshold`.
	 * @param {string} name
	 * @returns {boolean}
	 */
	getButtonHeld( name ) {

		const button = this._buttons.get( name );
		return button ? button.held : false;

	}

	/**
	 * Whether the button went down in the last update. True for one update per press, unlike
	 * `getButtonHeld`.
	 * @param {string} name
	 * @returns {boolean}
	 */
	getButtonPressed( name ) {

		const button = this._buttons.get( name );
		return button ? button.pressed : false;

	}

	/**
	 * Whether the button went up in the last update. True for one update per release.
	 * @param {string} name
	 * @returns {boolean}
	 */
	getButtonReleased( name ) {

		const button = this._buttons.get( name );
		return button ? button.released : false;

	}

	/**
	 * The axis position from -1 to 1, with the dead zone applied; for sticks, -1 is left or up. Also
	 * accepts a button name, giving how far the button is pressed from 0 to 1, e.g. a trigger's pull.
	 * Returns 0 for unknown names.
	 * @param {string} name
	 * @returns {number}
	 */
	getAxis( name ) {

		const axis = this._axes.get( name );
		if ( axis !== undefined ) return axis;

		const button = this._buttons.get( name );
		return button ? button.value : 0;

	}

	/**
	 * Names of the device's buttons. For the keyboard, only keys pressed so far.
	 * @returns {Iterable<string>}
	 */
	getButtonNames() {

		return this._buttons.keys();

	}

	/**
	 * Names of the device's axes. Empty for the keyboard and mouse.
	 * @returns {Iterable<string>}
	 */
	getAxisNames() {

		return this._axes.keys();

	}

	/**
	 * Reads the device's latest state and fires events for buttons that changed. Called by
	 * `ControllerManager.update`.
	 * @private
	 */
	update() {}

	_getButton( name ) {

		let button = this._buttons.get( name );
		if ( ! button ) {

			button = { value: 0, held: false, pressed: false, released: false };
			this._buttons.set( name, button );

		}

		return button;

	}

	_setButton( name, value ) {

		const button = this._getButton( name );
		const held = value >= ( button.held ? this.releaseThreshold : this.pressThreshold );
		button.pressed = held && ! button.held;
		button.released = ! held && button.held;
		button.held = held;
		button.value = value;

		if ( button.pressed ) this._dispatch( 'pressed', name );
		if ( button.released ) this._dispatch( 'released', name );

	}

	_setAxis( name, value ) {

		this._axes.set( name, value );

	}

	// releases every button and centers every axis, e.g. on disconnect or losing focus
	_releaseAll() {

		for ( const name of this._buttons.keys() ) this._setButton( name, 0 );
		for ( const name of this._axes.keys() ) this._setAxis( name, 0 );

	}

	_dispatch( type, name ) {

		const event = this._event;
		event.type = type;
		event.name = name;
		this.dispatchEvent( event );

	}

}

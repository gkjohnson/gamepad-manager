import { EventDispatcher } from './EventDispatcher.js';

/**
 * Fired when a button goes down. The event object is reused.
 * @event Controller#pressed
 * @property {string} name - The button's name.
 */

/**
 * Fired when a button goes up. The event object is reused.
 * @event Controller#released
 * @property {string} name - The button's name.
 */

/**
 * Base class for an input device with named buttons and axes.
 * @category Supporting
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
		 * How far an analog button must be pressed to count as held.
		 * @type {number}
		 */
		this.pressThreshold = 0.5;

		/**
		 * How far a held analog button must come back to count as released.
		 * @type {number}
		 */
		this.releaseThreshold = 0.4;

		this._buttons = new Map();
		this._axes = new Map();
		this._event = { type: '', name: '', target: null };

		// whether a button was pressed or an axis moved since the update started
		this._used = false;

	}

	/**
	 * The name printed on the device for a button, e.g. `'A'` or `'W'`.
	 * @param {string} name
	 * @returns {string}
	 */
	getButtonName( name ) {

		return name;

	}

	/**
	 * Whether the button is down.
	 * @param {string} name
	 * @returns {boolean}
	 */
	getButtonHeld( name ) {

		const button = this._buttons.get( name );
		return button ? button.held : false;

	}

	/**
	 * Whether the button went down in the last update.
	 * @param {string} name
	 * @returns {boolean}
	 */
	getButtonPressed( name ) {

		const button = this._buttons.get( name );
		return button ? button.pressed : false;

	}

	/**
	 * Whether the button went up in the last update.
	 * @param {string} name
	 * @returns {boolean}
	 */
	getButtonReleased( name ) {

		const button = this._buttons.get( name );
		return button ? button.released : false;

	}

	/**
	 * The axis value from -1 to 1, or how far a button is pressed from 0 to 1.
	 * @param {string} name
	 * @returns {number}
	 */
	getAxis( name ) {

		const axis = this._axes.get( name );
		if ( axis !== undefined ) {

			return axis;

		}

		const button = this._buttons.get( name );
		return button ? button.value : 0;

	}

	/**
	 * Reads the device's latest state.
	 * @private
	 * @returns {boolean} Whether a button was pressed or an axis moved.
	 */
	update() {

		return false;

	}

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

		if ( button.pressed ) {

			this._used = true;
			this._dispatch( 'pressed', name );

		}

		if ( button.released ) {

			this._dispatch( 'released', name );

		}

	}

	_setAxis( name, value ) {

		if ( value !== 0 && value !== this._axes.get( name ) ) {

			this._used = true;

		}

		this._axes.set( name, value );

	}

	// releases every button and centers every axis
	_releaseAll() {

		for ( const name of this._buttons.keys() ) {

			this._setButton( name, 0 );

		}

		for ( const name of this._axes.keys() ) {

			this._setAxis( name, 0 );

		}

	}

	_dispatch( type, name ) {

		const event = this._event;
		event.type = type;
		event.name = name;
		this.dispatchEvent( event );

	}

}

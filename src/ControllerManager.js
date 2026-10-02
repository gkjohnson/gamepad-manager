import { EventDispatcher } from './EventDispatcher.js';
import { GamepadController } from './GamepadController.js';
import { KeyboardController } from './KeyboardController.js';
import { MouseController } from './MouseController.js';

const _empty = [];

// how long, in milliseconds, a new gamepad matching a connected controller waits for that controller
// to disconnect before it's taken to be a second controller of the same model
const RECONNECT_WINDOW = 1000;

/**
 * Fired during `update` when a gamepad connects. The event object is reused, so copy any fields to
 * keep.
 * @event ControllerManager#connected
 * @property {GamepadController} controller
 * @property {number} slot
 */

/**
 * Fired during `update` when a gamepad disconnects. The controller stays in its slot. The event
 * object is reused, so copy any fields to keep.
 * @event ControllerManager#disconnected
 * @property {GamepadController} controller
 * @property {number} slot
 */

/**
 * Tracks connected gamepads in stable slots and gives access to the keyboard and mouse. Call
 * `update` once per frame to read every device's latest state.
 *
 * A connected gamepad never changes slot. A newly connected one takes a free slot that last held
 * the same model if there is one, so a controller that's unplugged and plugged back in returns to
 * its slot, and otherwise the lowest free slot. Browsers can report a plugged back in controller
 * before dropping its old entry, so a new gamepad of the same model as a connected one waits up to a
 * second for that one to disconnect before getting a slot of its own.
 *
 * @note Browsers don't expose a gamepad until a button is pressed on it.
 * @extends EventDispatcher
 */
export class ControllerManager extends EventDispatcher {

	constructor() {

		super();

		/**
		 * Gamepads by slot. Each stays in its slot after disconnecting, with `connected` false, so
		 * references to it remain valid and it's reused if the slot is filled again.
		 * @type {Array<GamepadController>}
		 */
		this.controllers = [];

		this._keyboard = null;
		this._mouse = null;
		this._pending = new Map();
		this._event = { type: '', controller: null, slot: - 1, target: null };

	}

	/**
	 * The gamepad in a slot, or null if no gamepad has used the slot yet. Check `connected`, since
	 * a gamepad stays in its slot after disconnecting.
	 * @param {number} slot
	 * @returns {GamepadController|null}
	 */
	getController( slot ) {

		return this.controllers[ slot ] || null;

	}

	/**
	 * The keyboard, created and listening for key events from the first call on. Updated by
	 * `update` along with the gamepads.
	 * @returns {KeyboardController}
	 */
	getKeyboard() {

		if ( ! this._keyboard ) this._keyboard = new KeyboardController();
		return this._keyboard;

	}

	/**
	 * The mouse, created and listening for mouse events from the first call on. Updated by
	 * `update` along with the gamepads.
	 * @returns {MouseController}
	 */
	getMouse() {

		if ( ! this._mouse ) this._mouse = new MouseController();
		return this._mouse;

	}

	/**
	 * Detects gamepads connecting and disconnecting, and updates every device. Call once per frame.
	 */
	update() {

		const { controllers } = this;
		const gamepads = navigator.getGamepads ? navigator.getGamepads() : _empty;

		for ( let i = 0, l = controllers.length; i < l; i ++ ) {

			const controller = controllers[ i ];
			if ( ! controller.connected ) continue;

			const gamepad = gamepads[ controller.index ];
			if ( ! gamepad || ! gamepad.connected || gamepad.id !== controller.id ) {

				controller.disconnect();
				this._dispatch( 'disconnected', controller, i );

			}

		}

		// forget waiting gamepads that have gone
		const pending = this._pending;
		if ( pending.size > 0 ) {

			for ( const index of pending.keys() ) {

				if ( ! gamepads[ index ] || ! gamepads[ index ].connected ) pending.delete( index );

			}

		}

		const now = performance.now();
		for ( let i = 0, l = gamepads.length; i < l; i ++ ) {

			const gamepad = gamepads[ i ];
			if ( ! gamepad || ! gamepad.connected || this._isTracked( gamepad.index ) ) continue;

			// a gamepad of the same model as a connected controller may be that controller plugged
			// back in before the browser drops its old entry, so it waits for that one to disconnect
			if ( this._isModelConnected( gamepad.id ) ) {

				if ( ! pending.has( gamepad.index ) ) pending.set( gamepad.index, now );
				if ( now - pending.get( gamepad.index ) < RECONNECT_WINDOW ) continue;

			}

			pending.delete( gamepad.index );
			const slot = this._findSlot( gamepad.id );
			const controller = controllers[ slot ];
			controller.connect( gamepad );
			this._dispatch( 'connected', controller, slot );

		}

		for ( let i = 0, l = controllers.length; i < l; i ++ ) {

			const controller = controllers[ i ];
			if ( controller.connected ) controller.update( gamepads[ controller.index ] );

		}

		if ( this._keyboard ) this._keyboard.update();
		if ( this._mouse ) this._mouse.update();

	}

	/**
	 * Removes the keyboard and mouse event listeners.
	 */
	dispose() {

		if ( this._keyboard ) this._keyboard.dispose();
		if ( this._mouse ) this._mouse.dispose();

	}

	_isTracked( index ) {

		const { controllers } = this;
		for ( let i = 0, l = controllers.length; i < l; i ++ ) {

			if ( controllers[ i ].connected && controllers[ i ].index === index ) return true;

		}

		return false;

	}

	_isModelConnected( id ) {

		const { controllers } = this;
		for ( let i = 0, l = controllers.length; i < l; i ++ ) {

			if ( controllers[ i ].connected && controllers[ i ].id === id ) return true;

		}

		return false;

	}

	// a free slot that last held this model, else the lowest free slot, else a new one
	_findSlot( id ) {

		const { controllers } = this;
		let free = - 1;
		for ( let i = 0, l = controllers.length; i < l; i ++ ) {

			const controller = controllers[ i ];
			if ( controller.connected ) continue;
			if ( controller.id === id ) return i;
			if ( free === - 1 ) free = i;

		}

		if ( free !== - 1 ) return free;

		controllers.push( new GamepadController() );
		return controllers.length - 1;

	}

	_dispatch( type, controller, slot ) {

		const event = this._event;
		event.type = type;
		event.controller = controller;
		event.slot = slot;
		this.dispatchEvent( event );

	}

}

import { EventDispatcher } from './EventDispatcher.js';
import { GamepadController } from './GamepadController.js';
import { KeyboardController } from './KeyboardController.js';
import { MouseController } from './MouseController.js';

/** @import { Controller } from './Controller.js' */

const _empty = [];

// how long a new gamepad waits for a connected one of the same model to disconnect, in ms
const RECONNECT_WINDOW = 1000;

/**
 * Fired when a gamepad connects. The event object is reused.
 * @event ControllerManager#connected
 * @property {GamepadController} controller
 * @property {number} slot
 */

/**
 * Fired when a gamepad disconnects. The event object is reused.
 * @event ControllerManager#disconnected
 * @property {GamepadController} controller
 * @property {number} slot
 */

/**
 * Tracks gamepads in stable slots and gives access to the keyboard and mouse. Call `update` once
 * per frame. A reconnected gamepad returns to its old slot.
 *
 * @note Browsers don't expose a gamepad until a button is pressed on it.
 * @extends EventDispatcher
 */
export class ControllerManager extends EventDispatcher {

	constructor() {

		super();

		/**
		 * Gamepads by slot, kept after disconnecting.
		 * @type {Array<GamepadController>}
		 */
		this.controllers = [];

		/**
		 * The device used most recently, e.g. for picking which button prompts to show.
		 * @type {Controller|null}
		 */
		this.lastActive = null;

		this._keyboard = null;
		this._mouse = null;
		this._pending = new Map();
		this._event = { type: '', controller: null, slot: - 1, target: null };

	}

	/**
	 * The gamepad in a slot, created if needed so listeners can be added before one connects.
	 * Check `connected` before using it.
	 * @param {number} slot
	 * @returns {GamepadController}
	 */
	getController( slot ) {

		const { controllers } = this;
		while ( controllers.length <= slot ) {

			const controller = new GamepadController();
			controller.slot = controllers.length;
			controllers.push( controller );

		}

		return controllers[ slot ];

	}

	/**
	 * The keyboard, created on the first call.
	 * @returns {KeyboardController}
	 */
	getKeyboard() {

		if ( ! this._keyboard ) this._keyboard = new KeyboardController();
		return this._keyboard;

	}

	/**
	 * The mouse, created on the first call.
	 * @returns {MouseController}
	 */
	getMouse() {

		if ( ! this._mouse ) this._mouse = new MouseController();
		return this._mouse;

	}

	/**
	 * Updates every device. Call once per frame.
	 */
	update() {

		const { controllers } = this;
		const gamepads = navigator.getGamepads ? navigator.getGamepads() : _empty;

		for ( let i = 0, l = controllers.length; i < l; i ++ ) {

			const controller = controllers[ i ];
			if ( ! controller.connected ) continue;

			const gamepad = gamepads[ controller._index ];
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

			// may be a connected controller plugged back in before the browser drops its old entry
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
			if ( controller.connected ) this._updateController( controller, gamepads[ controller._index ] );

		}

		if ( this._keyboard ) this._updateController( this._keyboard, null );
		if ( this._mouse ) this._updateController( this._mouse, null );

	}

	/**
	 * Removes disconnected gamepads and moves the rest down to fill the slots from 0.
	 */
	reassignSlots() {

		const { controllers } = this;
		let slot = 0;
		for ( let i = 0, l = controllers.length; i < l; i ++ ) {

			const controller = controllers[ i ];
			if ( controller.connected ) {

				controller.slot = slot;
				controllers[ slot ++ ] = controller;

			} else {

				controller.slot = - 1;

			}

		}

		controllers.length = slot;

	}

	/**
	 * Removes the keyboard and mouse event listeners.
	 */
	dispose() {

		if ( this._keyboard ) this._keyboard.dispose();
		if ( this._mouse ) this._mouse.dispose();

	}

	_updateController( controller, gamepad ) {

		controller._active = false;
		controller.update( gamepad );
		if ( controller._active ) this.lastActive = controller;

	}

	_isTracked( index ) {

		const { controllers } = this;
		for ( let i = 0, l = controllers.length; i < l; i ++ ) {

			if ( controllers[ i ].connected && controllers[ i ]._index === index ) return true;

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

		return this.getController( controllers.length ).slot;

	}

	_dispatch( type, controller, slot ) {

		const event = this._event;
		event.type = type;
		event.controller = controller;
		event.slot = slot;
		this.dispatchEvent( event );

	}

}

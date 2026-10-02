/**
 * Minimal event dispatcher, following three.js's `EventDispatcher`. Events are plain objects with a
 * `type`, so dispatchers can reuse one event object instead of allocating per dispatch.
 */
export class EventDispatcher {

	/**
	 * Adds a listener called with the event object whenever an event of this type fires. Adding the
	 * same listener twice has no effect.
	 * @param {string} type
	 * @param {Function} listener
	 */
	addEventListener( type, listener ) {

		if ( this._listeners === undefined ) this._listeners = {};

		const listeners = this._listeners;

		if ( listeners[ type ] === undefined ) {

			listeners[ type ] = [];

		}

		if ( listeners[ type ].indexOf( listener ) === - 1 ) {

			listeners[ type ].push( listener );

		}

	}

	/**
	 * Whether the listener is registered for this event type.
	 * @param {string} type
	 * @param {Function} listener
	 * @returns {boolean}
	 */
	hasEventListener( type, listener ) {

		const listeners = this._listeners;

		if ( listeners === undefined ) return false;

		return listeners[ type ] !== undefined && listeners[ type ].indexOf( listener ) !== - 1;

	}

	/**
	 * Removes a listener. Safe to call from inside a listener while its event is dispatching.
	 * @param {string} type
	 * @param {Function} listener
	 */
	removeEventListener( type, listener ) {

		const listeners = this._listeners;

		if ( listeners === undefined ) return;

		const listenerArray = listeners[ type ];

		if ( listenerArray !== undefined ) {

			const index = listenerArray.indexOf( listener );

			if ( index !== - 1 ) {

				listenerArray.splice( index, 1 );

			}

		}

	}

	/**
	 * Calls every listener registered for `event.type`, with `event.target` set to this dispatcher.
	 * @param {Object} event - A plain object with a `type` string and any other fields.
	 */
	dispatchEvent( event ) {

		const listeners = this._listeners;

		if ( listeners === undefined ) return;

		const listenerArray = listeners[ event.type ];

		if ( listenerArray !== undefined ) {

			event.target = this;

			// Make a copy, in case listeners are removed while iterating.
			const array = listenerArray.slice( 0 );

			for ( let i = 0, l = array.length; i < l; i ++ ) {

				array[ i ].call( this, event );

			}

			event.target = null;

		}

	}

}

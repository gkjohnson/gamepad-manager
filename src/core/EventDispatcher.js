/**
 * Minimal event dispatcher, following three.js's `EventDispatcher`.
 * @category Supporting
 */
export class EventDispatcher {

	/**
	 * Adds a listener for an event type.
	 * @param {string} type
	 * @param {Function} listener
	 */
	addEventListener( type, listener ) {

		if ( this._listeners === undefined ) {

			this._listeners = {};

		}

		const listeners = this._listeners;

		if ( listeners[ type ] === undefined ) {

			listeners[ type ] = [];

		}

		if ( listeners[ type ].indexOf( listener ) === - 1 ) {

			listeners[ type ].push( listener );

		}

	}

	/**
	 * Removes a listener.
	 * @param {string} type
	 * @param {Function} listener
	 */
	removeEventListener( type, listener ) {

		const listeners = this._listeners;

		if ( listeners === undefined ) {

			return;

		}

		const listenerArray = listeners[ type ];

		if ( listenerArray !== undefined ) {

			const index = listenerArray.indexOf( listener );

			if ( index !== - 1 ) {

				listenerArray.splice( index, 1 );

			}

		}

	}

	/**
	 * Calls every listener for `event.type`.
	 * @param {Object} event
	 */
	dispatchEvent( event ) {

		const listeners = this._listeners;

		if ( listeners === undefined ) {

			return;

		}

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

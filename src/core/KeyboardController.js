import { Controller } from './Controller.js';

/**
 * The keyboard, with buttons named by `KeyboardEvent.code`, like `KeyW`.
 * @extends Controller
 */
export class KeyboardController extends Controller {

	constructor() {

		super( 'keyboard' );
		this.connected = true;

		// keys to read each update: those down, and those just released
		this._codes = [];
		this._down = new Set();
		this._tapped = new Set();

		// the user's keyboard layout, where the browser exposes it
		this._layoutMap = null;
		if ( navigator.keyboard && navigator.keyboard.getLayoutMap ) {

			navigator.keyboard.getLayoutMap().then( map => {

				this._layoutMap = map;

			} ).catch( () => {} );

		}

		this._onKeyDown = e => {

			if ( e.repeat ) {

				return;

			}

			if ( ! this._codes.includes( e.code ) ) {

				this._codes.push( e.code );

			}

			this._down.add( e.code );
			this._tapped.add( e.code );

		};

		this._onKeyUp = e => {

			this._down.delete( e.code );

		};

		this._onBlur = () => {

			this._down.clear();

		};

		window.addEventListener( 'keydown', this._onKeyDown );
		window.addEventListener( 'keyup', this._onKeyUp );
		window.addEventListener( 'blur', this._onBlur );

	}

	/**
	 * The key's printed name, e.g. `'W'` for `KeyW`, following the user's layout where available.
	 * @param {string} name
	 * @returns {string}
	 */
	getButtonName( name ) {

		const layoutKey = this._layoutMap && this._layoutMap.get( name );
		if ( layoutKey ) {

			return layoutKey.toUpperCase();

		}

		// "KeyW" to "W", "Digit1" to "1", "ArrowUp" to "Up Arrow", "ShiftLeft" to "Left Shift", "PageUp"
		// to "Page Up"
		return name
			.replace( /^(Key|Digit)/, '' )
			.replace( /^Arrow(.+)$/, '$1Arrow' )
			.replace( /^(.+)(Left|Right)$/, '$2$1' )
			.replace( /([a-z])([A-Z0-9])/g, '$1 $2' );

	}

	/**
	 * @private
	 * @returns {boolean} Whether a key was pressed.
	 */
	update() {

		this._used = false;

		// backwards, so a finished key can be swapped out with the last one
		const { _codes, _down, _tapped } = this;
		for ( let i = _codes.length - 1; i >= 0; i -- ) {

			const code = _codes[ i ];
			this._setButton( code, _down.has( code ) || _tapped.has( code ) ? 1 : 0 );

			// drop a key once it's up and its release has been reported
			const button = this._buttons.get( code );
			if ( ! button.held && ! button.released ) {

				_codes[ i ] = _codes[ _codes.length - 1 ];
				_codes.pop();

			}

		}

		_tapped.clear();
		return this._used;

	}

	/**
	 * Removes the window event listeners.
	 * @private
	 */
	dispose() {

		window.removeEventListener( 'keydown', this._onKeyDown );
		window.removeEventListener( 'keyup', this._onKeyUp );
		window.removeEventListener( 'blur', this._onBlur );

	}

}

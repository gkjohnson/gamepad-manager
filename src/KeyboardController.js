import { Controller } from './Controller.js';

// printed names the general rule in getButtonName gets wrong, on a US layout
const KEY_NAMES = {
	Backquote: '`',
	Minus: '-',
	Equal: '=',
	BracketLeft: '[',
	BracketRight: ']',
	Backslash: '\\',
	Semicolon: ';',
	Quote: '\'',
	Comma: ',',
	Period: '.',
	Slash: '/',
	ArrowUp: 'Up',
	ArrowDown: 'Down',
	ArrowLeft: 'Left',
	ArrowRight: 'Right',
	Escape: 'Esc',
	ControlLeft: 'Left Ctrl',
	ControlRight: 'Right Ctrl',
};

/**
 * The keyboard, with buttons named by `KeyboardEvent.code`, like `KeyW`.
 * @extends Controller
 */
export class KeyboardController extends Controller {

	constructor() {

		super( 'keyboard' );
		this.connected = true;

		this._codes = [];
		this._down = new Set();
		this._tapped = new Set();

		// cached printed names, and the user's keyboard layout where available
		this._names = new Map();
		this._layoutMap = null;
		if ( navigator.keyboard && navigator.keyboard.getLayoutMap ) {

			navigator.keyboard.getLayoutMap().then( map => {

				this._layoutMap = map;
				this._names.clear();

			} ).catch( () => {} );

		}

		this._onKeyDown = e => {

			if ( e.repeat ) return;
			if ( ! this._buttons.has( e.code ) ) {

				this._getButton( e.code );
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

		let result = this._names.get( name );
		if ( result === undefined ) {

			const layoutKey = this._layoutMap && this._layoutMap.get( name );
			if ( layoutKey ) {

				result = layoutKey.toUpperCase();

			} else if ( name in KEY_NAMES ) {

				result = KEY_NAMES[ name ];

			} else {

				// "KeyW" to "W", "Digit1" to "1", "ShiftLeft" to "Left Shift", "PageUp" to "Page Up"
				result = name
					.replace( /^(Key|Digit)/, '' )
					.replace( /^(.+)(Left|Right)$/, '$2$1' )
					.replace( /([a-z])([A-Z0-9])/g, '$1 $2' );

			}

			this._names.set( name, result );

		}

		return result;

	}

	/**
	 * @private
	 */
	update() {

		const { _codes, _down, _tapped } = this;
		for ( let i = 0, l = _codes.length; i < l; i ++ ) {

			const code = _codes[ i ];
			this._setButton( code, _down.has( code ) || _tapped.has( code ) ? 1 : 0 );

		}

		_tapped.clear();

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

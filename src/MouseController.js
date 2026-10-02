import { Controller } from './Controller.js';

// names for MouseEvent.button values
const MOUSE_BUTTONS = [ 'left', 'middle', 'right', 'back', 'forward' ];

// printed names for the buttons
const MOUSE_NAMES = {
	left: 'Left Click',
	middle: 'Middle Click',
	right: 'Right Click',
	back: 'Mouse Back',
	forward: 'Mouse Forward',
};

/**
 * The mouse, with buttons `left`, `middle`, `right`, `back` and `forward`.
 * @extends Controller
 */
export class MouseController extends Controller {

	constructor() {

		super( 'mouse' );
		this.connected = true;

		this._down = new Set();
		this._tapped = new Set();
		for ( const name of MOUSE_BUTTONS ) this._getButton( name );

		// latest pointer position, and the one read at the last update
		this._clientX = 0;
		this._clientY = 0;
		this._x = 0;
		this._y = 0;

		this._onMouseDown = e => {

			const name = MOUSE_BUTTONS[ e.button ];
			if ( ! name ) return;
			this._down.add( name );
			this._tapped.add( name );

		};

		this._onMouseUp = e => {

			this._down.delete( MOUSE_BUTTONS[ e.button ] );

		};

		this._onMouseMove = e => {

			this._clientX = e.clientX;
			this._clientY = e.clientY;

		};

		this._onBlur = () => {

			this._down.clear();

		};

		window.addEventListener( 'mousedown', this._onMouseDown );
		window.addEventListener( 'mouseup', this._onMouseUp );
		window.addEventListener( 'mousemove', this._onMouseMove );
		window.addEventListener( 'blur', this._onBlur );

	}

	/**
	 * Gets the mouse position in CSS pixels from the window's top left.
	 * @param {{ x: number, y: number }} target
	 * @returns {{ x: number, y: number }}
	 */
	getPosition( target ) {

		target.x = this._x;
		target.y = this._y;
		return target;

	}

	/**
	 * The button's printed name, e.g. `'Left Click'`.
	 * @param {string} name
	 * @returns {string}
	 */
	getButtonName( name ) {

		return MOUSE_NAMES[ name ] || name;

	}

	/**
	 * @private
	 */
	update() {

		const { _down, _tapped } = this;
		for ( let i = 0, l = MOUSE_BUTTONS.length; i < l; i ++ ) {

			const name = MOUSE_BUTTONS[ i ];
			this._setButton( name, _down.has( name ) || _tapped.has( name ) ? 1 : 0 );

		}

		_tapped.clear();

		if ( this._x !== this._clientX || this._y !== this._clientY ) this._active = true;
		this._x = this._clientX;
		this._y = this._clientY;

	}

	/**
	 * Removes the window event listeners.
	 * @private
	 */
	dispose() {

		window.removeEventListener( 'mousedown', this._onMouseDown );
		window.removeEventListener( 'mouseup', this._onMouseUp );
		window.removeEventListener( 'mousemove', this._onMouseMove );
		window.removeEventListener( 'blur', this._onBlur );

	}

}

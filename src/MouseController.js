import { Controller } from './Controller.js';

// names for MouseEvent.button values
const MOUSE_BUTTONS = [ 'left', 'middle', 'right', 'back', 'forward' ];

/**
 * The mouse buttons: `left`, `middle`, `right`, `back` and `forward`. A click between two updates
 * still reads as pressed for one update. Held buttons are released when the window loses focus.
 * Get it from `ControllerManager.getMouse`.
 * @extends Controller
 */
export class MouseController extends Controller {

	constructor() {

		super( 'mouse' );
		this.connected = true;

		this._down = new Set();
		this._tapped = new Set();
		for ( const name of MOUSE_BUTTONS ) this._getButton( name );

		this._onMouseDown = e => {

			const name = MOUSE_BUTTONS[ e.button ];
			if ( ! name ) return;
			this._down.add( name );
			this._tapped.add( name );

		};

		this._onMouseUp = e => {

			this._down.delete( MOUSE_BUTTONS[ e.button ] );

		};

		this._onBlur = () => {

			this._down.clear();

		};

		window.addEventListener( 'mousedown', this._onMouseDown );
		window.addEventListener( 'mouseup', this._onMouseUp );
		window.addEventListener( 'blur', this._onBlur );

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

	}

	/**
	 * Removes the window event listeners. Called by `ControllerManager.dispose`.
	 * @private
	 */
	dispose() {

		window.removeEventListener( 'mousedown', this._onMouseDown );
		window.removeEventListener( 'mouseup', this._onMouseUp );
		window.removeEventListener( 'blur', this._onBlur );

	}

}

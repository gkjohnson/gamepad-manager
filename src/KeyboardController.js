import { Controller } from './Controller.js';

/**
 * The keyboard. Buttons are named by `KeyboardEvent.code`, the physical key position ( `KeyW`,
 * `Space`, `ArrowUp` ), so they stay put on any layout. A key tapped between two updates still
 * reads as pressed for one update. Held keys are released when the window loses focus. Get it from
 * `ControllerManager.getKeyboard`.
 * @extends Controller
 */
export class KeyboardController extends Controller {

	constructor() {

		super( 'keyboard' );
		this.connected = true;

		this._codes = [];
		this._down = new Set();
		this._tapped = new Set();

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
	 * Removes the window event listeners. Called by `ControllerManager.dispose`.
	 * @private
	 */
	dispose() {

		window.removeEventListener( 'keydown', this._onKeyDown );
		window.removeEventListener( 'keyup', this._onKeyUp );
		window.removeEventListener( 'blur', this._onBlur );

	}

}

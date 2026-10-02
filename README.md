# gamepad-manager

Gamepad, keyboard and mouse input for browser games, with one query and event API across devices.

- Gamepads stay in stable slots as controllers connect and disconnect.
- Buttons are named by position ( `south`, `left-trigger`, ... ), the same on Xbox, PlayStation and Switch controllers.
- Radial stick dead zones, and press and release thresholds so analog triggers don't flicker.
- Query state each frame or listen for `pressed` / `released` events, with no allocations per frame.

# Examples

`example/` shows a controller model whose buttons, triggers and sticks follow the gamepad in slot 0, tilting slightly as they're pushed.

# Use

```js
import { ControllerManager } from 'gamepad-manager';

const manager = new ControllerManager();
manager.addEventListener( 'connected', e => console.log( `${ e.controller.id } in slot ${ e.slot }` ) );

const keyboard = manager.getKeyboard();
keyboard.addEventListener( 'pressed', e => console.log( e.name ) );

function frame() {

	manager.update();

	const pad = manager.getController( 0 );
	if ( pad && pad.connected ) {

		if ( pad.getButtonPressed( 'south' ) ) jump();
		move( pad.getAxis( 'left-x' ), pad.getAxis( 'left-y' ) );

	}

	if ( keyboard.getButtonHeld( 'Space' ) ) jump();

	requestAnimationFrame( frame );

}

frame();
```

## Button names

Gamepads with the browser's `'standard'` mapping:

| Name | Xbox | PlayStation | Switch |
|---|---|---|---|
| `south` | A | Cross | B |
| `east` | B | Circle | A |
| `west` | X | Square | Y |
| `north` | Y | Triangle | X |
| `left-bumper`, `right-bumper` | LB, RB | L1, R1 | L, R |
| `left-trigger`, `right-trigger` | LT, RT | L2, R2 | ZL, ZR |
| `select`, `start` | View, Menu | Create, Options | -, + |
| `left-stick`, `right-stick` | stick presses | L3, R3 | stick presses |
| `dpad-up`, `dpad-down`, `dpad-left`, `dpad-right` | d-pad | d-pad | d-pad |
| `home` | Guide | PS | Home |

Axes are `left-x`, `left-y`, `right-x` and `right-y`, from -1 to 1. Unrecognized controllers get `button-0`, `axis-0` and so on.

The keyboard uses `KeyboardEvent.code` names ( `KeyW`, `Space`, `ArrowUp` ), and the mouse `left`, `middle`, `right`, `back` and `forward`.

# API

See [API.md](./API.md).

# Development

```bash
npm install
npm start
```

`npm start` serves the pages in `example/`, and `npm run lint` checks the code. `API.md` is generated from the JSDoc with [jsdoc2md](https://github.com/gkjohnson/jsdoc2md) and the settings in `jsdoc2md.config.js`.

# Credits

Controller model in the example: [Xbox Inalambric Controller (White)](https://sketchfab.com/3d-models/xbox-inalambric-controller-white-f18a70fc10414ef5a39b55de68f12823) by Chistodrako._., [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

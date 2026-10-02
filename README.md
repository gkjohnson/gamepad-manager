# gamepad-manager

Gamepad, keyboard and mouse input for browser games, with one query and event API across devices.

- Gamepads stay in stable slots as controllers connect and disconnect, until reassigned to fill the slots from 0.
- Buttons are named by position ( `south`, `left-trigger`, ... ), the same on Xbox, PlayStation and Switch controllers.
- Radial stick dead zones, and press and release thresholds so analog triggers don't flicker.
- Query state each frame or listen for `pressed` / `released` events, with no allocations per frame.
- Optional three.js controller models whose buttons and sticks move with a controller's state.

# Examples

`example/` shows a controller model for each connected gamepad, up to four, its buttons, triggers and sticks following the gamepad and tilting it slightly as they're pushed. The up and down arrow keys add and remove dummy controllers.

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

## Controller models

`gamepad-manager/three` has three.js models that show a controller's state, for the models in `example/models/`. A gamepad's `brand` ( `'xbox'`, `'playstation'`, `'switch'` or `''` ) picks the one to show:

```js
import { DualShockControllerModel, XboxControllerModel } from 'gamepad-manager/three';

const gltf = await new GLTFLoader().loadAsync( pad.brand === 'playstation' ? DUALSHOCK_URL : XBOX_URL );
const model = pad.brand === 'playstation' ? new DualShockControllerModel( gltf.scene ) : new XboxControllerModel( gltf.scene );
scene.add( model );

// each frame
model.setFromController( pad );
```

# API

See [API.md](./API.md), and [THREE_API.md](./THREE_API.md) for the models.

# Development

```bash
npm install
npm start
```

`npm start` serves the pages in `example/`, and `npm run lint` checks the code. `API.md` and `THREE_API.md` are generated from the JSDoc with [jsdoc2md](https://github.com/gkjohnson/jsdoc2md) and the settings in `jsdoc2md.config.js`.

# Credits

Controller models in `example/models/`, both [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and modified ( split into separate parts and compressed ):

- `xbox-controller.glb`: [Xbox Inalambric Controller (White)](https://sketchfab.com/3d-models/xbox-inalambric-controller-white-f18a70fc10414ef5a39b55de68f12823) by [Chistodrako._.](https://sketchfab.com/oscar.lopez.riviello)
- `dualshock-controller.glb`: [DualShock 4 PlayStation Controller](https://sketchfab.com/3d-models/dualshock-4-playstation-controller-e3c2f0dc16524fc19cdde45bad1de1a9) by [shaielwolf](https://sketchfab.com/shaielwolf)

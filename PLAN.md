# gamepad-manager plan

A browser library for game input: regular gamepads, the keyboard and the mouse behind one query and event API. Private, not published. This file records where things stand and what was decided.

## Status

First pass done:

- `ControllerManager`: polls `navigator.getGamepads()` in `update()`, keeps gamepads in stable slots, fires `connected` / `disconnected`, and gives the keyboard and mouse through `getKeyboard()` / `getMouse()`.
- `GamepadController`, `KeyboardController`, `MouseController` on a shared `Controller` base: `getButtonHeld` / `getButtonPressed` / `getButtonReleased` / `getAxis`, `pressed` / `released` / `connected` / `disconnected` events.
- `GamepadController.brand`: `'xbox'`, `'playstation'`, `'switch'` or `''`, guessed from the id ( USB vendor ids Microsoft `045e`, Sony `054c`, Nintendo `057e`, or names ).
- `gamepad-manager/three`: `ControllerModel` with `setButton` / `setAxis` / `setFromController` / `getTilt`, and `XboxControllerModel` and `DualShockControllerModel` for the two models.
- `example/` shows the model matching slot 0's brand with its parts following the gamepad, tipping to show the top while the bumpers or triggers are in use.

## Usage

```js
const manager = new ControllerManager();
manager.addEventListener( 'connected', e => console.log( e.slot, e.controller.id ) );

// each frame
manager.update();

const pad = manager.getController( 0 );
if ( pad && pad.connected ) {

	pad.getButtonPressed( 'south' );
	pad.getAxis( 'left-x' );

}

manager.getKeyboard().getButtonHeld( 'KeyW' );
manager.getMouse().getButtonPressed( 'left' );
```

## Decisions

- **Buttons named by position**, not brand letters. Face buttons are `south`, `east`, `west`, `north` ( A, B, X, Y on Xbox; Nintendo prints A and B the other way around ), then `left-bumper`, `right-bumper`, `left-trigger`, `right-trigger`, `select`, `start`, `left-stick`, `right-stick`, `dpad-up` / `down` / `left` / `right`, `home`. Axes `left-x`, `left-y`, `right-x`, `right-y`. These are the browser's `'standard'` mapping positions; the API exposes only numbered buttons and a model id string, no names.
- **Unrecognized controllers** ( `mapping === ''` ) get `button-0`, `axis-0` and so on.
- **Stable slots.** A connected gamepad never moves. A new one takes a free slot that last held the same model, else the lowest free slot. The browser gives only a model id, no serial, so identical controllers can't be told apart. Controllers stay in their slot after disconnecting ( `connected` false ), so references stay valid and are reused on reconnect. Browsers can list a plugged back in controller at a new index before dropping its old entry, which put the reconnect in a second slot; a new gamepad of the same model as a connected one now waits up to a second ( `RECONNECT_WINDOW` ) for that one to disconnect, so a second identical controller registers a second late.
- **Buttons are binary.** Held, pressed and released ( the latter two per update ) are the only button queries. How far an analog button is pressed is read with `getAxis( buttonName )`, 0 to 1. An analog button counts as held above `pressThreshold` ( 0.5 ) and stays held until below `releaseThreshold` ( 0.4 ), so triggers don't flicker. Axes are values only.
- **Dead zones** rescale so values ramp from 0 at the dead zone's edge. Sticks use one radial dead zone over x and y.
- **Keyboard** buttons are `KeyboardEvent.code` names ( `KeyW`, `Space` ), the physical position. **Mouse** buttons are `left`, `middle`, `right`, `back`, `forward`. A tap between two updates still reads as pressed for one update. Key repeat is ignored, and everything releases on window blur.
- **No garbage per frame.** Event objects are reused ( copy fields to keep them ) and loops are indexed. `EventDispatcher` follows three.js's, copying the listener list on dispatch so listeners can be removed mid-dispatch; that only happens when a button changes, not every frame.
- **No action map.** Considered a wrapper that binds controls to app actions ( `jump`, `move` ) with remapping; decided against it.

## Structure

- `src/EventDispatcher.js`, `Controller.js` ( shared state, queries, events ), `GamepadController.js`, `KeyboardController.js`, `MouseController.js`, `ControllerManager.js`.
- `src/three/`: the `gamepad-manager/three` entry. `ControllerModel` does the work from a few settings per model ( press, bumper and trigger directions, rocking or four-button d-pad, stick pivot depth ); the subclasses only supply those. Each stick gets a pivot group under it so it tilts as one piece, and each trigger one along its top front edge so it swings like a hinge; both work on either model without per-model hinge settings.
- The core has no three.js dependency; three.js is an optional peer dependency for `gamepad-manager/three`. `API.md` documents the core and `THREE_API.md` the models.

## Next

- A Switch Pro Controller model and `SwitchControllerModel`, skipped for now: the only free CC BY models found on Sketchfab are poor.
- Printed labels per brand ( A / Cross ... ) for on-screen prompts, from `brand`.
- Rumble through `vibrationActuator`.
- Mouse movement and wheel as axes.
- Axes as buttons: stick directions ( `left-stick-up` ... ) as ordinary buttons with the same thresholds, queries and events.
- Remapping for unrecognized controllers.
- Test real controllers in Chrome, Firefox and Safari: log each one's `id` and `mapping`.

## Starting point

`gkjohnson/webxr-sandbox`, folder `xr-gamepad` ( 2021, three.js r124 ): `WrappedGamepad` and `GamepadManager` became `GamepadController` and `ControllerManager`. Fixed in the port: string-dispatched events, names only for xbox / playstation ids, PlayStation labels, Chrome's stale gamepad objects when reading button values, per-event allocations.

## Controller support

Start with the main controllers: Xbox and XInput pads, recent PlayStation pads and the Switch Pro Controller, which Chrome and Safari report with the `'standard'` mapping. Cheap USB pads, retro adapters, arcade and flight sticks and wheels are often unrecognized. Firefox has historically recognized fewer controllers than Chrome.

## Controller models

Both are CC BY 4.0 and credited in the README. The credit for any model shown must stay visible wherever the demo is hosted ( `example/index.html` credits both ). Both name their moving parts the same way, by position: `button_south` / `east` / `west` / `north`, `button_select`, `button_start`, `button_home`, `bumper_left` / `right`, `trigger_left` / `right`, `stick_left` / `right` ( one node each ), and `dpad` or `dpad_up` / `down` / `left` / `right`. Each has its pivot at its center.

### Xbox

`example/models/xbox-controller.glb`, 830 KB.

- Source: [Xbox Inalambric Controller (White)](https://sketchfab.com/3d-models/xbox-inalambric-controller-white-f18a70fc10414ef5a39b55de68f12823) by [Chistodrako._.](https://sketchfab.com/oscar.lopez.riviello).
- The download is one mesh. Its 31 pieces became the moving parts above under a `controller` root, with each stick's cap, ring and base merged into `stick_left` / `right`, the guide logo into `button_home`, and everything static into `body`. The d-pad is one piece ( `dpad` ).
- Pieces were found as connected parts of the mesh. The bumpers and triggers only touch the body along texture seams, so they were cut out separately.
- Compressed with gltf-transform: `metalrough` ( the download used the old specular-glossiness material, which three.js no longer supports ), `prune`, `dedup`, `quantize`, `webp`. No Draco or meshopt.
- The split and naming script is not in the repo. It was a one-off; redo it from this description if the model needs rebuilding.
- The face points along ( 0, 0.75, 0.66 ) in model space; `XboxControllerModel` presses buttons along the opposite direction.

### DualShock 4

`example/models/dualshock-controller.glb`, 1.75 MB ( from 65 MB ).

- Source: [DualShock 4 PlayStation Controller](https://sketchfab.com/3d-models/dualshock-4-playstation-controller-e3c2f0dc16524fc19cdde45bad1de1a9) by [shaielwolf](https://sketchfab.com/shaielwolf).
- The download has 8 meshes ( front and back shells, touchpad, joysticks, buttons, triggers, headphone jack, screws and USB ), each already split into separate pieces. Moving parts became their own nodes, named by position, with pivots at their centers: `button_south` / `east` / `west` / `north`, `button_select` ( Share ), `button_start` ( Options ), `button_home` ( PS ), `dpad_up` / `down` / `left` / `right` ( separate arrows ), `stick_left` / `right` ( one piece each ), `bumper_left` / `right`, `trigger_left` / `right`, `touchpad`. The static pieces of each mesh merged into `body_front`, `body_back`, `shoulder_strips` ( the strip between each bumper and trigger, which isn't part of either ), `headphone_jack` and `screws_usb`.
- Centered and scaled to the Xbox model's width ( 0.824 ). The face points along +z.
- Compressed with gltf-transform: `prune`, `dedup`, `resize` ( 4096 textures to 1024 ), `quantize`, `webp`. Only the first UV set kept. No Draco or meshopt.
- Like the Xbox model, the processing script is not in the repo.

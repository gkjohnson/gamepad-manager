# gamepad-manager plan

A browser library for game input: regular gamepads, the keyboard and the mouse behind one query and event API. Private, not published. This file records where things stand and what was decided.

## Status

First pass done:

- `ControllerManager`: polls `navigator.getGamepads()` in `update()`, keeps gamepads in stable slots, fires `connected` / `disconnected`, and gives the keyboard and mouse through `getKeyboard()` / `getMouse()`.
- `GamepadController`, `KeyboardController`, `MouseController` on a shared `Controller` base: `getButtonHeld` / `getButtonPressed` / `getButtonReleased` / `getAxis`, `pressed` / `released` / `connected` / `disconnected` events.
- `example/` shows the controller model, with slot 0's buttons, triggers and sticks moving the matching parts.

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
- **Stable slots.** A connected gamepad never moves. A new one takes a free slot that last held the same model, else the lowest free slot. The browser gives only a model id, no serial, so identical controllers can't be told apart. Controllers stay in their slot after disconnecting ( `connected` false ), so references stay valid and are reused on reconnect.
- **Buttons are binary.** Held, pressed and released ( the latter two per update ) are the only button queries. How far an analog button is pressed is read with `getAxis( buttonName )`, 0 to 1. An analog button counts as held above `pressThreshold` ( 0.5 ) and stays held until below `releaseThreshold` ( 0.4 ), so triggers don't flicker. Axes are values only.
- **Dead zones** rescale so values ramp from 0 at the dead zone's edge. Sticks use one radial dead zone over x and y.
- **Keyboard** buttons are `KeyboardEvent.code` names ( `KeyW`, `Space` ), the physical position. **Mouse** buttons are `left`, `middle`, `right`, `back`, `forward`. A tap between two updates still reads as pressed for one update. Key repeat is ignored, and everything releases on window blur.
- **No garbage per frame.** Event objects are reused ( copy fields to keep them ) and loops are indexed. `EventDispatcher` follows three.js's, copying the listener list on dispatch so listeners can be removed mid-dispatch; that only happens when a button changes, not every frame.
- **No action map.** Considered a wrapper that binds controls to app actions ( `jump`, `move` ) with remapping; decided against it.

## Structure

- `src/EventDispatcher.js`, `Controller.js` ( shared state, queries, events ), `GamepadController.js`, `KeyboardController.js`, `MouseController.js`, `ControllerManager.js`.
- The core has no three.js dependency. three.js is only a dev dependency for the example.

## Next

- Printed labels per brand ( A / Cross ... ) for on-screen prompts, guessed from the id string ( USB vendor ids: Microsoft `045e`, Sony `054c`, Nintendo `057e`; format differs per browser ).
- Rumble through `vibrationActuator`.
- Mouse movement and wheel as axes.
- Axes as buttons: stick directions ( `left-stick-up` ... ) as ordinary buttons with the same thresholds, queries and events.
- Remapping for unrecognized controllers.
- Test real controllers in Chrome, Firefox and Safari: log each one's `id` and `mapping`.

## Starting point

`gkjohnson/webxr-sandbox`, folder `xr-gamepad` ( 2021, three.js r124 ): `WrappedGamepad` and `GamepadManager` became `GamepadController` and `ControllerManager`. Fixed in the port: string-dispatched events, names only for xbox / playstation ids, PlayStation labels, Chrome's stale gamepad objects when reading button values, per-event allocations.

## Controller support

Start with the main controllers: Xbox and XInput pads, recent PlayStation pads and the Switch Pro Controller, which Chrome and Safari report with the `'standard'` mapping. Cheap USB pads, retro adapters, arcade and flight sticks and wheels are often unrecognized. Firefox has historically recognized fewer controllers than Chrome.

## Controller model

`example/models/xbox-controller.glb`, 830 KB.

- Source: [Xbox Inalambric Controller (White)](https://sketchfab.com/3d-models/xbox-inalambric-controller-white-f18a70fc10414ef5a39b55de68f12823) by Chistodrako._., CC BY 4.0. The credit must stay visible wherever the demo is hosted.
- The download is one mesh. It was split into 31 named parts, each its own node under a `controller` root with its pivot at the part's center: `body`, `dpad`, `button_a` / `b` / `x` / `y`, `button_view`, `button_menu`, `button_guide`, `guide_logo`, `button_pair`, `bumper_left` / `right`, `trigger_left` / `right`, `stick_left_cap` / `ring` / `base` and the right equivalents, plus shell pieces ( `grips_inner`, `battery_cover`, `top_panel`, `grip_right_panel` ) and `detail_*` pieces that weren't identified.
- Pieces were found as connected parts of the mesh. The bumpers and triggers only touch the body along texture seams, so they were cut out separately.
- Compressed with gltf-transform: `metalrough` ( the download used the old specular-glossiness material, which three.js no longer supports ), `prune`, `dedup`, `quantize`, `webp`. No Draco or meshopt.
- The split and naming script is not in the repo. It was a one-off; redo it from this description if the model needs rebuilding.
- The face points along ( 0, 0.75, 0.66 ) in model space; the example presses buttons along the opposite direction.

To do:

- Triggers should rotate about their hinge, not their center. The example slides them for now.
- Each stick's cap, ring and base need one shared pivot at the base so the stick tilts as a unit. The example slides all three, so the base leaves its socket.
- Only an Xbox model exists. Other brands would need their own.

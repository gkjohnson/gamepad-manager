# gamepad-manager plan

A browser library for game input: regular gamepads, the keyboard and the mouse behind one query and event API. Private, not published. This file records where things stand and what was decided.

## Status

First pass done:

- `ControllerManager`: polls `navigator.getGamepads()` in `update()`, keeps gamepads in stable slots, fires `connected` / `disconnected`, and gives the keyboard and mouse through `getKeyboard()` / `getMouse()`. `lastActive` is the device that last had a button pressed, an axis moved (changed and non-zero, so a held stick doesn't keep claiming it) or the mouse moved.
- `GamepadController`, `KeyboardController`, `MouseController` on a shared `Controller` base: `getButtonHeld` / `getButtonPressed` / `getButtonReleased` / `getAxis`, `pressed` / `released` / `connected` / `disconnected` events, and `getButtonName` for printed names, returning the name unchanged on the base class. The keyboard's uses `navigator.keyboard.getLayoutMap` where available (Chrome) for letter, number and punctuation keys, else US characters and a rule turning codes into words (`ShiftLeft` to `Left Shift`). The mouse's are `Left Click` and so on.
- `GamepadController.brand`: `'xbox'`, `'playstation'`, `'nintendo'` or `''`, guessed from the id (USB vendor ids Microsoft `045e`, Sony `054c`, Nintendo `057e`, with or without the leading zero, or names). `getButtonName` gives a button's printed name for the brand (`'A'`, `'Cross'`), the Xbox names for unknown brands, and the name unchanged without the `'standard'` mapping.
- `GamepadController.rumble( type, params )` passes through to `vibrationActuator.playEffect`, and `stopRumble()` to `reset`. `features.rumble` and `features.triggerRumble` come from the actuator's `effects` list in Chrome; Safari has no list, so `rumble` is true whenever it has an actuator and `triggerRumble` false. Firefox has no `vibrationActuator`, only the older `hapticActuators`, so it can't rumble.
- `gamepad-manager/three`: `ControllerModel` with `setButton` / `setAxis` / `setFromController` / `getTilt`, and `XboxControllerModel` and `DualShockControllerModel` for the two models.
- `example/` shows the model matching slot 0's brand while a gamepad is connected, with its parts following the gamepad, tipping to show the top while the bumpers or triggers are in use. With none connected it only asks for one to be plugged in.

## Usage

```js
const manager = new ControllerManager();
manager.addEventListener( 'connected', e => console.log( e.slot, e.controller.id ) );

// each frame
manager.update();

const pad = manager.getController( 0 );
if ( pad.connected ) {

	pad.getButtonPressed( 'south' );
	pad.getAxis( 'left-x' );

}

manager.getKeyboard().getButtonHeld( 'KeyW' );
manager.getMouse().getButtonPressed( 'left' );
```

## Decisions

- **Buttons named by position**, not brand letters. Face buttons are `south`, `east`, `west`, `north` (A, B, X, Y on Xbox; Nintendo prints A and B the other way around), then `left-bumper`, `right-bumper`, `left-trigger`, `right-trigger`, `select`, `start`, `left-stick`, `right-stick`, `dpad-up` / `down` / `left` / `right`, `home`. Axes `left-x`, `left-y`, `right-x`, `right-y`. These are the browser's `'standard'` mapping positions; the API exposes only numbered buttons and a model id string, no names.
- **Unrecognized controllers** (`mapping === ''`) get `button-0`, `axis-0` and so on.
- **Stable slots.** A connected gamepad never moves. A new one takes a free slot that last held the same model, else the lowest free slot. The browser gives only a model id, no serial, so identical controllers can't be told apart. Controllers stay in their slot after disconnecting (`connected` false), so references stay valid and are reused on reconnect. Browsers can list a plugged back in controller at a new index before dropping its old entry, which put the reconnect in a second slot; a new gamepad of the same model as a connected one now waits up to a second (`RECONNECT_WINDOW`) for that one to disconnect, so a second identical controller registers a second late. `reassignSlots()` drops disconnected controllers and fills the slots from 0, for when the app wants to reshuffle, like a start screen where players are connecting. A controller's `id` is only its model, and can differ for the same controller over USB and Bluetooth. Each controller has its `slot`, -1 once dropped by `reassignSlots()`; the browser's gamepad index is private, since apps have no use for it. `getController( slot )` creates the slot's controller if needed, disconnected, so apps add listeners once up front instead of in `connected`, where a reused controller would collect a listener per reconnect. `reassignSlots()` still drops disconnected controllers, including ones created this way.
- **Buttons are binary.** Held, pressed and released (the latter two per update) are the only button queries. How far an analog button is pressed is read with `getAxis( buttonName )`, 0 to 1. An analog button counts as held above `pressThreshold` (0.5) and stays held until below `releaseThreshold` (0.4), so triggers don't flicker. Each axis direction is also a button with the same thresholds, queries and events, from the dead-zoned value: `left-stick-up` / `down` / `left` / `right` and the same for `right-stick`, or `axis-0-negative` / `axis-0-positive` without the `'standard'` mapping.
- **Dead zones** rescale so values ramp from 0 at the dead zone's edge. Sticks use one radial dead zone over x and y.
- **Keyboard** buttons are `KeyboardEvent.code` names (`KeyW`, `Space`), the physical position. **Mouse** buttons are `left`, `middle`, `right`, `back`, `forward`. A tap between two updates still reads as pressed for one update. Key repeat is ignored, and everything releases on window blur. The mouse position comes from `getPosition( target )`, in CSS pixels from the window's top left, read at each update like the buttons; mouse movement and wheel as axes were skipped for now.
- **No garbage per frame.** Event objects are reused (copy fields to keep them) and loops are indexed. `EventDispatcher` follows three.js's, copying the listener list on dispatch so listeners can be removed mid-dispatch; that only happens when a button changes, not every frame.
- **No action map.** Considered a wrapper that binds controls to app actions (`jump`, `move`) with remapping; decided against it.

## Structure

- `src/EventDispatcher.js`, `Controller.js` (shared state, queries, events), `GamepadController.js`, `KeyboardController.js`, `MouseController.js`, `ControllerManager.js`.
- `src/three/`: the `gamepad-manager/three` entry. `ControllerModel` moves the parts the models share. Each subclass handles its own differences directly, like `XboxControllerModel` overriding `setButton` for its rocking d-pad; no settings objects. The models are only ours, not a system for users to add their own.
- The core has no three.js dependency; three.js is an optional peer dependency for `gamepad-manager/three`. `API.md` documents the core and `THREE_API.md` the models.

## Next

- A Switch Pro Controller model and `SwitchControllerModel`, skipped for now: the only free CC BY models found on Sketchfab are poor.
- Mouse movement and wheel as axes.
- Remapping for unrecognized controllers.
- Test real controllers in Chrome, Firefox and Safari: log each one's `id` and `mapping`.
- Model textures, to keep high res detail in less GPU memory: review how much of each map is actually unused (the DualShock's `body_front` covers 32% of its map, `body_back` 46%, touchpad and buttons 63%, Xbox 85%, spread across the whole map so trimming the edges doesn't help), possibly generate new, smaller atlases from the 4096 originals, and use texture repetition / trimming, especially for the DualShock's touchpad.

## Starting point

`gkjohnson/webxr-sandbox`, folder `xr-gamepad` (2021, three.js r124): `WrappedGamepad` and `GamepadManager` became `GamepadController` and `ControllerManager`. Fixed in the port: string-dispatched events, names only for xbox / playstation ids, PlayStation labels, Chrome's stale gamepad objects when reading button values, per-event allocations.

## Controller support

Start with the main controllers: Xbox and XInput pads, recent PlayStation pads and the Switch Pro Controller, which Chrome and Safari report with the `'standard'` mapping. Cheap USB pads, retro adapters, arcade and flight sticks and wheels are often unrecognized. Firefox has historically recognized fewer controllers than Chrome.

## Controller models

Both are CC BY 4.0 and credited in the README. They ship in the package and each model class loads its own with `new URL( './models/x.glb', import.meta.url )`, chosen over a CDN default or inlining them in JS; Rollup needs a plugin and esbuild doesn't support it. The constructor returns right away, empty until `loaded` resolves. Each model loads its own copy, the browser cache sparing a second download, so `dispose()` can free its geometry, materials and textures, closing their image bitmaps, without breaking other models; a shared loaded scene cloned per model was tried first. Disposing before the load finishes frees the scene when it arrives. Both name their moving parts the same way, by position: `button_south` / `east` / `west` / `north`, `button_select`, `button_start`, `button_home`, `bumper_left` / `right`, `trigger_left` / `right`, `stick_left` / `right` (one node each), and `dpad` or `dpad_up` / `down` / `left` / `right`. Each has its pivot at its center. Both lie face up, the sticks along +y and the top edge toward -z, so the model classes share the same directions; the demo stands them up toward the camera.

### Xbox

`src/three/models/xbox-controller.glb`, 705 KB, one 1024 color map, about 6 MB of GPU memory.

- Source: [Xbox Inalambric Controller (White)](https://sketchfab.com/3d-models/xbox-inalambric-controller-white-f18a70fc10414ef5a39b55de68f12823) by [Chistodrako._.](https://sketchfab.com/oscar.lopez.riviello).
- The download is one mesh. Its 31 pieces became the moving parts above under a `controller` root, with each stick's cap, ring and base merged into `stick_left` / `right`, the guide logo into `button_home`, and everything static into `body`. The d-pad is one piece (`dpad`).
- Pieces were found as connected parts of the mesh. The bumpers and triggers only touch the body along texture seams, so they were cut out separately.
- Compressed with gltf-transform: `metalrough` (the download used the old specular-glossiness material, which three.js no longer supports), `prune`, `dedup`, `quantize`, `webp`. No Draco or meshopt.
- The split and naming script is not in the repo. It was a one-off; redo it from this description if the model needs rebuilding.
- Turned so the sticks point along +y.
- Shrunk later: tangents dropped (three.js derives them), 8 bit normals, the 2048 color map halved to 1024, and the flat metal / roughness and specular maps replaced with factors.

### DualShock 4

`src/three/models/dualshock-controller.glb`, 833 KB (from 65 MB), about 4.3 MB of GPU memory.

- Source: [DualShock 4 PlayStation Controller](https://sketchfab.com/3d-models/dualshock-4-playstation-controller-e3c2f0dc16524fc19cdde45bad1de1a9) by [shaielwolf](https://sketchfab.com/shaielwolf).
- The download has 8 meshes (front and back shells, touchpad, joysticks, buttons, triggers, headphone jack, screws and USB), each already split into separate pieces. Moving parts became their own nodes, named by position, with pivots at their centers: `button_south` / `east` / `west` / `north`, `button_select` (Share), `button_start` (Options), `button_home` (PS), `dpad_up` / `down` / `left` / `right` (separate arrows), `stick_left` / `right` (one piece each), `bumper_left` / `right`, `trigger_left` / `right`, `touchpad`. The static pieces of each mesh merged into `body_front`, `body_back`, `shoulder_strips` (the strip between each bumper and trigger, which isn't part of either), `headphone_jack` and `screws_usb`.
- Centered, scaled to the Xbox model's width (0.824) and turned so the sticks point along +y.
- Compressed with gltf-transform: `prune`, `dedup`, `resize` (4096 textures to 1024), `quantize`, `webp`. Only the first UV set kept. No Draco or meshopt.
- Like the Xbox model, the processing script is not in the repo.
- Shrunk later: tangents dropped, 8 bit normals, normal maps to 512 and the two flat ones removed, the flat color maps of the sticks and of the triggers, bumpers and strips replaced with colors, every metal / roughness map (and the unused occlusion sharing it) replaced with its average, the light bar split from `body_back` into a `light_bar` material with a flat emissive blue instead of an emissive map, and `headphone_jack` and `screws_usb` each split into flat plastic and metal materials instead of their two-color maps, and simplified to about 20% of their triangles.
- Rebuilt from the 4096 source maps: triangles whose texels are one flat color moved to plain color materials with no uvs, so the maps hold only real detail (text, button symbols, the back label, the grip normal maps), repacked into small atlases and scaled to a quarter (normal maps an eighth). The touchpad's dots became one repeating 64x64 dot tile with uvs in dot cells, its plain triangles pointing at the tile's plain corner.
- Rejected: mesh simplification of the large surfaces left visible shading artifacts on both models; 512 color maps made the printed text illegible. The same flat color treatment on the Xbox gave seam slivers the white body color on the dark sticks and d-pad and left artifacts in the A, so it was reverted; the DualShock went through the same sliver rule and should be checked for the same.

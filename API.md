<!-- This file is generated automatically. Do not edit it directly. -->
# gamepad-manager

## Constants

### _empty

```js
_empty
```

## EventDispatcher

Minimal event dispatcher, following three.js's `EventDispatcher`. Events are plain objects with a
`type`, so dispatchers can reuse one event object instead of allocating per dispatch.


### .addEventListener

```js
addEventListener( type: string, listener: function ): void
```

Adds a listener called with the event object whenever an event of this type fires. Adding the
same listener twice has no effect.


### .hasEventListener

```js
hasEventListener( type: string, listener: function ): boolean
```

Whether the listener is registered for this event type.


### .removeEventListener

```js
removeEventListener( type: string, listener: function ): void
```

Removes a listener. Safe to call from inside a listener while its event is dispatching.


### .dispatchEvent

```js
dispatchEvent( event: Object ): void
```

Calls every listener registered for `event.type`, with `event.target` set to this dispatcher.


## ControllerManager

_extends [`EventDispatcher`](#eventdispatcher)_

Tracks connected gamepads in stable slots and gives access to the keyboard and mouse. Call
`update` once per frame to read every device's latest state.

A connected gamepad never changes slot. A newly connected one takes a free slot that last held
the same model if there is one, so a controller that's unplugged and plugged back in returns to
its slot, and otherwise the lowest free slot. Browsers can report a plugged back in controller
before dropping its old entry, so a new gamepad of the same model as a connected one waits up to a
second for that one to disconnect before getting a slot of its own.

> [!NOTE]
> Browsers don't expose a gamepad until a button is pressed on it.

### events

```js
// Fired during `update` when a gamepad connects. The event object is reused, so copy any fields to
// keep.
{ type: 'connected', controller: GamepadController, slot: number }

// Fired during `update` when a gamepad disconnects. The controller stays in its slot. The event
// object is reused, so copy any fields to keep.
{ type: 'disconnected', controller: GamepadController, slot: number }
```

### .controllers

```js
controllers: Array<GamepadController>
```

Gamepads by slot. Each stays in its slot after disconnecting, with `connected` false, so
references to it remain valid and it's reused if the slot is filled again.


### .lastActive

```js
lastActive: Controller | null
```

The device that most recently had a button pressed, a stick or axis moved, or, for the mouse,
moved, e.g. for switching on-screen prompts between keyboard and gamepad. Null until then.
Kept after a gamepad disconnects.


### .getController

```js
getController( slot: number ): GamepadController | null
```

The gamepad in a slot, or null if no gamepad has used the slot yet. Check `connected`, since
a gamepad stays in its slot after disconnecting.


### .getKeyboard

```js
getKeyboard(): KeyboardController
```

The keyboard, created and listening for key events from the first call on. Updated by
`update` along with the gamepads.


### .getMouse

```js
getMouse(): MouseController
```

The mouse, created and listening for mouse events from the first call on. Updated by
`update` along with the gamepads.


### .update

```js
update(): void
```

Detects gamepads connecting and disconnecting, and updates every device. Call once per frame.


### .reassignSlots

```js
reassignSlots(): void
```

Removes disconnected gamepads and moves connected ones down, in order, to fill the slots from
0. A gamepad plugged back in after this no longer returns to the slot it left.


### .dispose

```js
dispose(): void
```

Removes the keyboard and mouse event listeners.


## Controller

_extends [`EventDispatcher`](#eventdispatcher)_

Base class for an input device: named buttons and axes, queried after each `update` or listened
to through events. Buttons are either held or not; how far an analog button is pressed is read
with `getAxis`. Controllers are created by `ControllerManager`.


### events

```js
// Fired during `update` when a button goes down. The event object is reused, so copy any fields to
// keep.
{ type: 'pressed', name: string }

// Fired during `update` when a button goes up. The event object is reused, so copy any fields to
// keep.
{ type: 'released', name: string }
```

### .type

```js
type: string
```

The kind of device: `'gamepad'`, `'keyboard'` or `'mouse'`.


### .connected

```js
connected: boolean
```

Whether the device is available. Always true for the keyboard and mouse.


### .pressThreshold

```js
pressThreshold: number
```

How far an analog button, such as a trigger, must be pressed to count as held.


### .releaseThreshold

```js
releaseThreshold: number
```

How far a held analog button must come back to count as released. Lower than
`pressThreshold` so a trigger resting near it doesn't flicker.


### .getButtonName

```js
getButtonName( name: string ): string
```

The name printed on the device for a button, e.g. `'A'` for a gamepad's `south` or `'W'` for
the keyboard's `KeyW`, for on-screen prompts. Implemented by each device; this returns `name`.


### .getButtonHeld

```js
getButtonHeld( name: string ): boolean
```

Whether the button is down. True on every update while held, including the one it went down.
Analog buttons count as held from `pressThreshold` until they drop below `releaseThreshold`.


### .getButtonPressed

```js
getButtonPressed( name: string ): boolean
```

Whether the button went down in the last update. True for one update per press, unlike
`getButtonHeld`.


### .getButtonReleased

```js
getButtonReleased( name: string ): boolean
```

Whether the button went up in the last update. True for one update per release.


### .getAxis

```js
getAxis( name: string ): number
```

The axis position from -1 to 1, with the dead zone applied; for sticks, -1 is left or up. Also
accepts a button name, giving how far the button is pressed from 0 to 1, e.g. a trigger's pull.
Returns 0 for unknown names.


### .getButtonNames

```js
getButtonNames(): Iterable<string>
```

Names of the device's buttons. For the keyboard, only keys pressed so far.


### .getAxisNames

```js
getAxisNames(): Iterable<string>
```

Names of the device's axes. Empty for the keyboard and mouse.


## GamepadController

_extends [`Controller`](#controller)_

A gamepad. With the browser's `'standard'` mapping buttons are named by position: the face buttons
`south`, `east`, `west` and `north` ( A, B, X, Y on Xbox ), then `left-bumper`, `right-bumper`,
`left-trigger`, `right-trigger`, `select`, `start`, `left-stick`, `right-stick`, `dpad-up`,
`dpad-down`, `dpad-left`, `dpad-right` and `home`, and axes `left-x`, `left-y`, `right-x` and
`right-y`. Otherwise they're named `button-0`, `axis-0` and so on.

Each axis direction is also a button, held past `pressThreshold` like a trigger: `left-stick-up`,
`left-stick-down`, `left-stick-left`, `left-stick-right` and the same for `right-stick`, or
`axis-0-negative`, `axis-0-positive` and so on without the `'standard'` mapping.

Created by `ControllerManager`, and kept in its slot across disconnects so references stay valid.


### events

```js
// Fired when a gamepad connects to this controller, before the manager's `connected` event.
{ type: 'connected' }

// Fired when the gamepad disconnects, after its held buttons are released, and before the
// manager's `disconnected` event.
{ type: 'disconnected' }
```

### .id

```js
id: string
```

The browser's id for the controller model, e.g. its product name. Kept after disconnecting.


### .brand

```js
brand: string
```

The controller's brand, guessed from `id`: `'xbox'`, `'playstation'`, `'nintendo'`, or `''`
when unknown. Many third-party controllers report themselves as Xbox controllers.


### .index

```js
index: number
```

The browser's index for the connected gamepad, or -1.


### .features

```js
features: GamepadFeatures
```

What the connected gamepad exposes.


### .deadZone

```js
deadZone: number
```

Stick values under this distance from center read as 0, and values beyond it are rescaled to
start from 0. Applied to each stick's x and y together.


### .getButtonName

```js
getButtonName( name: string ): string
```

Returns the name printed on the controller for a button, e.g. `'A'` for `south` on Xbox and
`'Cross'` on PlayStation. Unknown brands get the Xbox names, and controllers without the
`'standard'` mapping get `name` back.


### .rumble

```js
rumble( type: string, params: Object ): Promise<string> | null
```

Plays a rumble effect through the gamepad's `vibrationActuator.playEffect`. Check
`features.rumble` and `features.triggerRumble` for support.


### .stopRumble

```js
stopRumble(): Promise<string> | null
```

Stops the current rumble effect through the gamepad's `vibrationActuator.reset`. The stopped
effect's promise resolves `'preempted'`.


## KeyboardController

_extends [`Controller`](#controller)_

The keyboard. Buttons are named by `KeyboardEvent.code`, the physical key position ( `KeyW`,
`Space`, `ArrowUp` ), so they stay put on any layout. A key tapped between two updates still
reads as pressed for one update. Held keys are released when the window loses focus. Get it from
`ControllerManager.getKeyboard`.


### .getButtonName

```js
getButtonName( name: string ): string
```

The key's printed name, e.g. `'W'` for `KeyW`, `'Left Shift'` for `ShiftLeft` and `'Page Up'`
for `PageUp`. Letter, number and punctuation keys follow the user's layout in browsers that
expose it ( `navigator.keyboard.getLayoutMap` ), and a US layout otherwise.


## MouseController

_extends [`Controller`](#controller)_

The mouse buttons: `left`, `middle`, `right`, `back` and `forward`. A click between two updates
still reads as pressed for one update. Held buttons are released when the window loses focus.
Get it from `ControllerManager.getMouse`.


### .getPosition

```js
getPosition( target: Object ): Object
```

Gets the mouse position in CSS pixels from the window's top left corner, as of the last update.
Reads 0, 0 until the mouse first moves over the page.


### .getButtonName

```js
getButtonName( name: string ): string
```

The button's printed name: `'Left Click'`, `'Middle Click'`, `'Right Click'`, `'Mouse Back'` or
`'Mouse Forward'`.


## GamepadFeatures


### .mapping

```js
mapping: string
```

The browser's mapping: `'standard'`, or `''` when the controller
isn't recognized and buttons and axes are only numbered.

### .buttons

```js
buttons: number
```

Number of buttons.

### .axes

```js
axes: number
```

Number of axes.

### .rumble

```js
rumble: boolean
```

Whether the gamepad supports the `'dual-rumble'` effect. Browsers
without a list of supported effects, like Safari, report true whenever they expose a vibration
actuator.

### .triggerRumble

```js
triggerRumble: boolean
```

Whether the gamepad supports the `'trigger-rumble'` effect,
the motors in the triggers of Xbox controllers.

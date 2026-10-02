<!-- This file is generated automatically. Do not edit it directly. -->
# gamepad-manager

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
the same model if there is one, so a controller that's unplugged and plugged back in usually
returns to its slot, and otherwise the lowest free slot.

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


## KeyboardController

_extends [`Controller`](#controller)_

The keyboard. Buttons are named by `KeyboardEvent.code`, the physical key position ( `KeyW`,
`Space`, `ArrowUp` ), so they stay put on any layout. A key tapped between two updates still
reads as pressed for one update. Held keys are released when the window loses focus. Get it from
`ControllerManager.getKeyboard`.


## MouseController

_extends [`Controller`](#controller)_

The mouse buttons: `left`, `middle`, `right`, `back` and `forward`. A click between two updates
still reads as pressed for one update. Held buttons are released when the window loses focus.
Get it from `ControllerManager.getMouse`.


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

Whether the browser exposes a vibration actuator.

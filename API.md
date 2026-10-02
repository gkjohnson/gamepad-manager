<!-- This file is generated automatically. Do not edit it directly. -->
# gamepad-manager

## Constants

### _empty

```js
_empty
```

## EventDispatcher

Minimal event dispatcher, following three.js's `EventDispatcher`.


### .addEventListener

```js
addEventListener( type: string, listener: function ): void
```

Adds a listener for an event type.


### .hasEventListener

```js
hasEventListener( type: string, listener: function ): boolean
```

Whether the listener is registered for this event type.


### .removeEventListener

```js
removeEventListener( type: string, listener: function ): void
```

Removes a listener.


### .dispatchEvent

```js
dispatchEvent( event: Object ): void
```

Calls every listener for `event.type`.


## ControllerManager

_extends [`EventDispatcher`](#eventdispatcher)_

Tracks gamepads in stable slots and gives access to the keyboard and mouse. Call `update` once
per frame. A reconnected gamepad returns to its old slot.

> [!NOTE]
> Browsers don't expose a gamepad until a button is pressed on it.

### events

```js
// Fired when a gamepad connects. The event object is reused.
{ type: 'connected', controller: GamepadController, slot: number }

// Fired when a gamepad disconnects. The event object is reused.
{ type: 'disconnected', controller: GamepadController, slot: number }
```

### .controllers

```js
controllers: Array<GamepadController>
```

Gamepads by slot, kept after disconnecting.


### .lastActive

```js
lastActive: Controller | null
```

The device used most recently, e.g. for picking which button prompts to show.


### .getController

```js
getController( slot: number ): GamepadController | null
```

The gamepad in a slot, or null. Check `connected` before using it.


### .getKeyboard

```js
getKeyboard(): KeyboardController
```

The keyboard, created on the first call.


### .getMouse

```js
getMouse(): MouseController
```

The mouse, created on the first call.


### .update

```js
update(): void
```

Updates every device. Call once per frame.


### .reassignSlots

```js
reassignSlots(): void
```

Removes disconnected gamepads and moves the rest down to fill the slots from 0.


### .dispose

```js
dispose(): void
```

Removes the keyboard and mouse event listeners.


## Controller

_extends [`EventDispatcher`](#eventdispatcher)_

Base class for an input device with named buttons and axes.


### events

```js
// Fired when a button goes down. The event object is reused.
{ type: 'pressed', name: string }

// Fired when a button goes up. The event object is reused.
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

How far an analog button must be pressed to count as held.


### .releaseThreshold

```js
releaseThreshold: number
```

How far a held analog button must come back to count as released.


### .getButtonName

```js
getButtonName( name: string ): string
```

The name printed on the device for a button, e.g. `'A'` or `'W'`.


### .getButtonHeld

```js
getButtonHeld( name: string ): boolean
```

Whether the button is down.


### .getButtonPressed

```js
getButtonPressed( name: string ): boolean
```

Whether the button went down in the last update.


### .getButtonReleased

```js
getButtonReleased( name: string ): boolean
```

Whether the button went up in the last update.


### .getAxis

```js
getAxis( name: string ): number
```

The axis value from -1 to 1, or how far a button is pressed from 0 to 1.


### .getButtonNames

```js
getButtonNames(): Iterable<string>
```

Names of the device's buttons.


### .getAxisNames

```js
getAxisNames(): Iterable<string>
```

Names of the device's axes.


## GamepadController

_extends [`Controller`](#controller)_

A gamepad, with buttons and axes named by position, like `south` and `left-x`. See the README for
the full list.


### events

```js
// Fired when the gamepad connects.
{ type: 'connected' }

// Fired when the gamepad disconnects.
{ type: 'disconnected' }
```

### .id

```js
id: string
```

The browser's id for the controller model.


### .brand

```js
brand: string
```

`'xbox'`, `'playstation'`, `'nintendo'`, or `''` when unknown.


### .slot

```js
slot: number
```

The controller's slot in the manager, or -1 once removed by `reassignSlots`.


### .features

```js
features: GamepadFeatures
```

What the connected gamepad exposes.


### .deadZone

```js
deadZone: number
```

Stick values under this distance from center read as 0.


### .getButtonName

```js
getButtonName( name: string ): string
```

The name printed on the controller for a button, e.g. `'A'` or `'Cross'`. Xbox names for
unknown brands.


### .rumble

```js
rumble( type: string, params: Object ): Promise<string> | null
```

Plays a rumble effect through `vibrationActuator.playEffect`. Returns null if unsupported.


### .stopRumble

```js
stopRumble(): Promise<string> | null
```

Stops the current rumble effect. Returns null if unsupported.


## KeyboardController

_extends [`Controller`](#controller)_

The keyboard, with buttons named by `KeyboardEvent.code`, like `KeyW`.


### .getButtonName

```js
getButtonName( name: string ): string
```

The key's printed name, e.g. `'W'` for `KeyW`, following the user's layout where available.


## MouseController

_extends [`Controller`](#controller)_

The mouse, with buttons `left`, `middle`, `right`, `back` and `forward`.


### .getPosition

```js
getPosition( target: Object ): Object
```

Gets the mouse position in CSS pixels from the window's top left.


### .getButtonName

```js
getButtonName( name: string ): string
```

The button's printed name, e.g. `'Left Click'`.


## GamepadFeatures


### .mapping

```js
mapping: string
```

`'standard'`, or `''` when the controller isn't recognized.

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

Whether `'dual-rumble'` is supported.

### .triggerRumble

```js
triggerRumble: boolean
```

Whether `'trigger-rumble'` is supported.

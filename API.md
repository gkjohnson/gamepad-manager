<!-- This file is generated automatically. Do not edit it directly. -->
# gamepad-manager

## EventDispatcher

Minimal event dispatcher, following three.js's `EventDispatcher`.


### .addEventListener

```js
addEventListener( type: string, listener: function ): void
```

Adds a listener for an event type.


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
getController( slot: number ): GamepadController
```

The gamepad in a slot, created if needed so listeners can be added before one connects.
Check `connected` before using it.


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


## GamepadController

_extends [`Controller`](#controller)_

A gamepad, with buttons and axes named by position. Buttons are `south`, `east`, `west`, `north`,
`left-bumper`, `right-bumper`, `left-trigger`, `right-trigger`, `select`, `start`, `left-stick`,
`right-stick`, `dpad-up`, `dpad-down`, `dpad-left`, `dpad-right` and `home`, plus each stick
direction, like `left-stick-up`. Axes are `left-x`, `left-y`, `right-x` and `right-y`. Gamepads
without the `'standard'` mapping get `button-0`, `axis-0` and so on.


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


### .mapping

```js
mapping: string
```

The browser's mapping: `'standard'`, or `''` when the controller isn't recognized.


### .hasRumble

```js
hasRumble: boolean
```

Whether `rumble` supports `'dual-rumble'`.


### .hasTriggerRumble

```js
hasTriggerRumble: boolean
```

Whether `rumble` supports `'trigger-rumble'`.


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
rumble( type: string, params: Object ): Promise<string>
```

Plays a rumble effect through `vibrationActuator.playEffect`. Check `hasRumble` first.


### .stopRumble

```js
stopRumble(): Promise<string>
```

Stops the current rumble effect.


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


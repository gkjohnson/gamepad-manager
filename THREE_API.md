<!-- This file is generated automatically. Do not edit it directly. -->
# gamepad-manager/three

## ControllerModel

_extends `Group`_

A 3D controller whose buttons, triggers, d-pad and sticks move to show a controller's state. Wraps
a loaded model with a node per moving part, named by position: `button_south`, `button_east`,
`button_west`, `button_north`, `button_select`, `button_start`, `button_home`, `bumper_left` /
`right`, `trigger_left` / `right`, `stick_left` / `right` and `dpad`, or `dpad_up` / `down` /
`left` / `right`. Sticks tilt about their node's origin, which should be the center of the ball at
their base. Use a subclass for a specific controller model.


### .constructor

```js
constructor( scene: Object3D, settings: ControllerModelSettings )
```

### .setButton

```js
setButton( name: string, value: number ): void
```

Shows a button pressed by `value`, from 0 for released to 1 for fully pressed. Analog buttons
like triggers can take values in between. Button names are the same as `GamepadController`'s.


### .setAxis

```js
setAxis( name: string, value: number ): void
```

Shows a stick pushed: `left-x`, `left-y`, `right-x` or `right-y`, from -1 to 1 with -1 left or
up, as `GamepadController.getAxis` reports them.


### .setFromController

```js
setFromController( controller: Controller ): void
```

Shows a controller's current buttons and sticks.


### .getTilt

```js
getTilt( target: Vector3 ): Vector3
```

Gets the turning force the current presses would apply to the controller, as if each were a
finger pushing at that part. Its direction is the axis to tilt about and its length how much,
e.g. for tilting the model slightly as buttons are pressed.


## DualShockControllerModel

_extends [`ControllerModel`](#controllermodel)_

A PlayStation DualShock 4 controller model, for `example/models/dualshock-controller.glb`. Its
d-pad is four separate buttons.


### .constructor

```js
constructor( scene: Object3D )
```

## XboxControllerModel

_extends [`ControllerModel`](#controllermodel)_

An Xbox controller model, for `example/models/xbox-controller.glb`. Its d-pad is one piece that
rocks toward the pressed direction.


### .constructor

```js
constructor( scene: Object3D )
```

## ControllerModelSettings


### .press

```js
press: Vector3
```

Direction into the controller's face, for face buttons, the d-pad and
stick presses.

### .bumper

```js
bumper: Vector3
```

Direction bumpers move when pressed.

### .trigger

```js
trigger: Vector3
```

Direction a pulled trigger pushes the controller, for `getTilt`.
Triggers themselves swing about their top front edge.

### .dpadRocks

```js
dpadRocks: boolean
```

Whether the d-pad is one piece that rocks toward the pressed
direction ( a `dpad` part ) rather than four separate buttons ( `dpad_up` and so on ).

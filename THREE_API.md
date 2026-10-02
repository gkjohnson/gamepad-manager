<!-- This file is generated automatically. Do not edit it directly. -->
# gamepad-manager/three

## ControllerModel

_extends `Group`_

Base class for the 3D controller models.


### .constructor

```js
constructor( scene: Object3D )
```

### .setButton

```js
setButton( name: string, value: number ): void
```

Shows a button pressed, from 0 to 1.


### .setAxis

```js
setAxis( name: string, value: number ): void
```

Shows a stick axis pushed, from -1 to 1.


### .setFromController

```js
setFromController( controller: Controller ): void
```

Shows a controller's current state.


### .getTilt

```js
getTilt( target: Vector3 ): Vector3
```

Gets the turning force the current presses apply to the controller, for tilting it slightly.


## DualShockControllerModel

_extends [`ControllerModel`](#controllermodel)_

A PlayStation DualShock 4 controller model, for `example/models/dualshock-controller.glb`.


### .constructor

```js
constructor( scene: Object3D )
```

## XboxControllerModel

_extends [`ControllerModel`](#controllermodel)_

An Xbox controller model, for `example/models/xbox-controller.glb`.


### .constructor

```js
constructor( scene: Object3D )
```

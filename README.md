# gamepad-manager

[![build](https://img.shields.io/github/actions/workflow/status/gkjohnson/gamepad-manager/node.js.yml?style=flat-square&label=build&branch=main)](https://github.com/gkjohnson/gamepad-manager/actions)
[![docs](https://img.shields.io/badge/docs-API-blue?style=flat-square)](https://gkjohnson.github.io/tools/docs/gamepad-manager/)
[![github](https://flat.badgen.net/badge/icon/github?icon=github&label)](https://github.com/gkjohnson/gamepad-manager/)
[![twitter](https://flat.badgen.net/badge/twitter/@garrettkjohnson/?icon&label)](https://twitter.com/garrettkjohnson)
[![sponsors](https://img.shields.io/github/sponsors/gkjohnson?style=flat-square&color=1da1f2)](https://github.com/sponsors/gkjohnson/)

Gamepad, keyboard and mouse input for browser games with one query and event API, gamepads kept in stable slots, and optional three.js controller models.

> [!NOTE]
> This project is not hosted on npm and must be installed via Github repository.

# Examples

[Controller viewer](https://gkjohnson.github.io/gamepad-manager/index.html)

# Installation

```
npm install github:@gkjohnson/gamepad-manager
```

# API

See the [docs site](https://gkjohnson.github.io/tools/docs/gamepad-manager/) for full API documentation.

The same documentation is also available as markdown in [API.md](./API.md) and, for the three.js controller models, [THREE_API.md](./THREE_API.md).

# Use

```js
import { ControllerManager } from 'gamepad-manager';

const manager = new ControllerManager();
const pad = manager.getController( 0 );

function frame() {

	manager.update();

	if ( pad.getButtonPressed( 'south' ) ) {

		jump();

	}

	move( pad.getAxis( 'left-x' ), pad.getAxis( 'left-y' ) );
	requestAnimationFrame( frame );

}

frame();
```

# Model License Information

Controller models are licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) and have been modified.

[Xbox Controller](https://sketchfab.com/3d-models/xbox-inalambric-controller-white-f18a70fc10414ef5a39b55de68f12823) by [Chistodrako._.](https://sketchfab.com/oscar.lopez.riviello)

[DualShock 4 Controller](https://sketchfab.com/3d-models/dualshock-4-playstation-controller-e3c2f0dc16524fc19cdde45bad1de1a9) by [shaielwolf](https://sketchfab.com/shaielwolf)

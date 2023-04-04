# Mirror Hand Gesture Recognition (HGR)

This is an experimental project testing hand gesture recognition in the browser, using a simple webcam. It uses two Tensorflow JS projects ([Hand Pose Detection](https://github.com/tensorflow/tfjs-models/tree/master/hand-pose-detection) and [MoveNet](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection/src/movenet)) which detect and estimate poses of hands and bodies, to then track the hand positions and recognize static hand gestures.

**WARNING!** This project is a **WORK IN PROGRESS** and experimental, everything is subject to change! Use at your own risk!

## Setup

This project is based on Angular and uses the [Angular CLI](https://github.com/angular/angular-cli) and the [Yarn](https://yarnpkg.com/) package Manager.

To install them, you need a recent version of [Node.js](https://nodejs.org/).

Run the following commands to setup and run the project:

*(On Linux, you might need to use **sudo** to install things globally)*

```bash
# If node or npm versions are not up to date:
npm install --global n
n lts

# To install angular cli (ng) and yarn:
npm install --global @angular/cli yarn

# To download all project dependencies:
cd mirror-hgr # navigate to your cloned directory
yarn

# To run a dev server:
ng serve --open
```

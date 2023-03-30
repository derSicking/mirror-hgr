import * as handPoseDetection from "@tensorflow-models/hand-pose-detection";
import "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";
import "@mediapipe/hands";

import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

import { PixelInput } from "@tensorflow-models/pose-detection/dist/shared/calculators/interfaces/common_interfaces";

class Vec2D {
    constructor(public x: number, public y: number) {}
}

class Vec3D {
    constructor(public x: number, public y: number, public z: number) {}
}

class KeyPoint extends Vec2D {
    constructor(
        public x: number,
        public y: number,
        public name: string,
        public score: number
    ) {
        super(x, y);
    }
}

class KeyPoint3D extends Vec3D {
    constructor(
        public x: number,
        public y: number,
        public z: number,
        public name: string
    ) {
        super(x, y, z);
    }
}

class Box {
    constructor(
        public width: number,
        public height: number,
        public xMin: number,
        public xMax: number,
        public yMin: number,
        public yMax: number
    ) {}
}

class ScoredValue<T> {
    constructor(public score: number, public value: T) {}
}

class HandPose {
    constructor(
        private _keypoints: KeyPoint[],
        private _keypoints3d: KeyPoint3D[],
        private _handedness: string,
        private _score: number
    ) {}

    public get keypoints() {
        return this._keypoints;
    }

    public get keypoints3D() {
        return this._keypoints3d;
    }

    public get isLeftHand() {
        // This is inverted on purpose
        return new ScoredValue<boolean>(
            this._score,
            this._handedness === "Right"
        );
    }
}

class BodyPose {
    constructor(
        private _keypoints: KeyPoint[],
        public score: number,
        public box: Box,
        public id: number
    ) {}

    public get keypoints() {
        return this._keypoints;
    }
}

class Tracker {
    private _poseDetector: poseDetection.PoseDetector | undefined;
    private _handPoseDetector: handPoseDetection.HandDetector | undefined;

    private _init = false;
    private _running = false;

    private _poses: poseDetection.Pose[] | undefined;
    private _hands: handPoseDetection.Hand[] | undefined;

    constructor() {}

    private async init() {
        this._poseDetector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            { modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING }
        );

        this._handPoseDetector = await handPoseDetection.createDetector(
            handPoseDetection.SupportedModels.MediaPipeHands,
            {
                runtime: "mediapipe",
                // TODO: fix the doc root
                solutionPath: "/mirror-hgr/node_modules/@mediapipe/hands",
                modelType: "full",
                maxHands: 4,
            }
        );
        this._init = true;
    }

    public async start() {
        if (!this._init) await this.init();
        this._running = true;
    }

    public stop() {
        this._running = false;
    }

    public async track(image: PixelInput) {
        if (!this._running) return;
        this._poses = await this._poseDetector?.estimatePoses(image);
        this._hands = await this._handPoseDetector?.estimateHands(image);
    }
}

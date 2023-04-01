import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import '@mediapipe/hands';

import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

import { Vec2D, Vec3D, Box } from './vec';

interface Named {
  name: string;
}
interface Scored {
  score: number;
}

class Keypoint2D extends Vec2D implements Named {
  constructor(x: number, y: number, public name: string) {
    super(x, y);
  }

  public static fromTfjsKeypoint(keypoint: handPoseDetection.Keypoint) {
    if (!keypoint.name) {
      console.error(keypoint);
      throw new Error('Incomplete keypoint data in a tfjs hand pose!');
    }
    return new Keypoint2D(keypoint.x, keypoint.y, keypoint.name!);
  }
}

class Keypoint3D extends Vec3D implements Named {
  constructor(x: number, y: number, z: number, public name: string) {
    super(x, y, z);
  }

  public static fromTfjsKeypoint(keypoint: handPoseDetection.Keypoint) {
    if (!keypoint.name || keypoint.z == undefined) {
      console.error(keypoint);
      throw new Error('Incomplete keypoint data in a tfjs hand pose!');
    }
    return new Keypoint3D(keypoint.x, keypoint.y, keypoint.z!, keypoint.name!);
  }
}

class ScoredKeypoint2D extends Keypoint2D implements Scored {
  constructor(x: number, y: number, public score: number, name: string) {
    super(x, y, name);
  }

  public static override fromTfjsKeypoint(keypoint: poseDetection.Keypoint) {
    if (!keypoint.score || !keypoint.name) {
      console.error(keypoint);
      throw new Error('Incomplete keypoint data in a MoveNet pose!');
    }
    return new ScoredKeypoint2D(
      keypoint.x,
      keypoint.y,
      keypoint.score!,
      keypoint.name!
    );
  }
}

class PoseKeypoints {
  constructor(public array: ScoredKeypoint2D[]) {
    if (array.length != 17) {
      console.error(array);
      throw new Error('Wrong amount of keypoints in a pose!');
    }
  }

  public static fromTfjsKeypoints(keypoints: poseDetection.Keypoint[]) {
    if (keypoints.length != 17) {
      console.error(keypoints);
      throw new Error('Wrong amount of keypoints in a MoveNet pose!');
    }
    return new PoseKeypoints(keypoints.map(ScoredKeypoint2D.fromTfjsKeypoint));
  }

  public get nose() {
    return this.array[0];
  }

  public get leftWrist() {
    return this.array[9];
  }

  public get rightWrist() {
    return this.array[10];
  }

  // TODO: add named getters for all keypoints
}

class Pose implements Scored {
  constructor(
    public box: Box,
    public id: number,
    public keypoints: PoseKeypoints,
    public score: number
  ) {}

  public static fromTfjsPose(pose: poseDetection.Pose) {
    if (!pose.box || pose.id == undefined || !pose.score) {
      console.error(pose);
      throw new Error('There was a problem with the MoveNet tfjs model data!');
    }

    return new Pose(
      new Box(
        new Vec2D(pose.box!.xMin, pose.box!.yMin),
        new Vec2D(pose.box!.xMax, pose.box!.yMax)
      ),
      pose.id!,
      PoseKeypoints.fromTfjsKeypoints(pose.keypoints),
      pose.score!
    );
  }

  public distance(other: Pose) {
    let scoreSum = 0;
    let distAcc = 0;
    for (let i = 0; i < 17; i++) {
      let kp = this.keypoints.array[i];
      let kpo = other.keypoints.array[i];
      distAcc += kp.minus(kpo).magnitude * kp.score * kpo.score;
      scoreSum += kp.score + kpo.score;
    }
    distAcc /= scoreSum;
    return distAcc;
  }
}

class HandPoseKeypoints {
  public angles: number[];
  constructor(
    public keypoints2D: Keypoint2D[],
    public keypoints3D: Keypoint3D[]
  ) {
    if (keypoints2D.length != 21 || keypoints3D.length != 21) {
      console.error(keypoints2D);
      console.error(keypoints3D);
      throw new Error('Wrong amount of keypoints in a hand pose!');
    }
    this.angles = this.calculateAngles(keypoints3D);
  }

  private calculateAngles(keypoints: Keypoint3D[]) {
    for (let finger = 0; finger < 5; finger++) {
      for (let joint = 0; joint < 3; joint++) {
        // calculate angle at joint
        // kp[finger * 4 + joint + 1]
      }
    }
    return [];
  }

  public static fromTfjsHandPose(hand: handPoseDetection.Hand) {
    if (hand.keypoints.length != 21 || hand.keypoints3D?.length != 21) {
      console.error(hand);
      throw new Error('Wrong amount of keypoints in a tfjs hand pose!');
    }
    return new HandPoseKeypoints(
      hand.keypoints.map(Keypoint2D.fromTfjsKeypoint),
      hand.keypoints3D!.map(Keypoint3D.fromTfjsKeypoint)
    );
  }

  private combinedKeypoint(index: number) {
    return {
      kp2d: this.keypoints2D[index],
      kp3d: this.keypoints3D[index],
      name: this.keypoints2D[index].name,
    };
  }

  public get wrist() {
    return this.combinedKeypoint(0);
  }
  public get indexStart() {
    return this.combinedKeypoint(5);
  }
  public get pinkyStart() {
    return this.combinedKeypoint(17);
  }

  // TODO: add named getters for all keypoints
}

class HandPose implements Scored {
  constructor(
    public isPredictedLeftHand: boolean,
    public score: number,
    public keypoints: HandPoseKeypoints
  ) {}

  static fromTfjsHandPose(hand: handPoseDetection.Hand) {
    return new HandPose(
      hand.handedness === 'Right',
      hand.score,
      HandPoseKeypoints.fromTfjsHandPose(hand)
    );
  }
}

export class Tracker {
  private _poseDetector?: poseDetection.PoseDetector;
  private _handPoseDetector?: handPoseDetection.HandDetector;

  private _init = false;
  private _initStarted = false;

  private _poses: Pose[];
  private _hands: HandPose[];

  private _width?: number;
  private _height?: number;

  constructor() {
    this._poses = [];
    this._hands = [];
  }

  public async init() {
    this._initStarted = true;
    this._poseDetector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING }
    );

    this._handPoseDetector = await handPoseDetection.createDetector(
      handPoseDetection.SupportedModels.MediaPipeHands,
      {
        runtime: 'mediapipe',
        solutionPath: '/assets/hands',
        modelType: 'full',
        maxHands: 4,
      }
    );
    this._init = true;
  }

  public async update(
    image:
      | ImageData
      | HTMLVideoElement
      | HTMLImageElement
      | HTMLCanvasElement
      | ImageBitmap
  ) {
    if (!this._init && !this._initStarted) {
      await this.init();
    } else {
      if (this._width == undefined) {
        this._width = image.width;
        this._height = image.height;
      } else if (this.width != image.width || this.height != image.height) {
        console.warn('Dimensions of input image changed!');
        this._width = image.width;
        this._height = image.height;
      }
      this._poses =
        (await this._poseDetector?.estimatePoses(image))?.map(
          Pose.fromTfjsPose
        ) || [];

      this._hands =
        (await this._handPoseDetector?.estimateHands(image))?.map(
          HandPose.fromTfjsHandPose
        ) || [];
    }
  }

  public get poses() {
    return this._poses;
  }

  public get hands() {
    return this._hands;
  }

  public get width() {
    return this._width ? this._width : 0;
  }

  public get height() {
    return this._height ? this._height : 0;
  }

  public get frameSize() {
    return Math.max(this.width, this.height);
  }
}

export class Person {
  public pose?: Pose;
}

export class Hand {
  public handPose?: HandPose;
  private _center: Vec2D;

  private _lastSeen: number;
  private _lastTracked: number;

  // TODO: This should be polar coords to factor in forearm rotation
  public wristOffset: Vec2D;

  public previousWrist?: ScoredKeypoint2D;

  public palmFacingCamera = false;

  constructor() {
    this._center = new Vec2D(0, 0);

    this._lastSeen = 0;
    this._lastTracked = 0;

    this.wristOffset = new Vec2D(0, 0);
  }

  public get center() {
    if (this.handPose) {
      this._center = this.handPose.keypoints.wrist.kp2d
        .plus(this.handPose.keypoints.indexStart.kp2d)
        .plus(this.handPose.keypoints.pinkyStart.kp2d)
        .scale(1 / 3);
    }
    return this._center;
  }

  public set center(center: Vec2D) {
    this._center = center;
  }

  public seen() {
    this._lastSeen = Date.now();
    this.tracked();
  }

  public tracked() {
    this._lastTracked = Date.now();
  }

  public get lastSeen() {
    return this._lastSeen;
  }

  public get lastTracked() {
    return this._lastTracked;
  }
}

export class SinglePersonTrackerConfig {
  public posePicker = {
    scoreMultiplier: 1.0,
    centerDistanceMultiplier: 2.0,
    maxPoseDistance: 1.0,
  };
  public handPicker = {
    rawScoreMultiplier: 2.0,
    handednessMultiplier: 1.0,
    distanceMultiplier: 70.0,
    distanceDeltaMultiplier: 100.0,
    wristScoreThreshold: 0.2,
    maxHandWristDistanceAccurate: 0.2,
    maxHandWristDistanceFuzzy: 0.3,
  };
}

export class SinglePersonTracker extends Tracker {
  private _leftHand: Hand;
  private _rightHand: Hand;
  private _person: Person;

  public get leftHand() {
    return this._leftHand;
  }

  public get rightHand() {
    return this._rightHand;
  }

  public get bothHands() {
    return [this.leftHand, this.rightHand];
  }

  public get person() {
    return this._person;
  }

  constructor(
    private _config: SinglePersonTrackerConfig = new SinglePersonTrackerConfig()
  ) {
    super();
    this._leftHand = new Hand();
    this._rightHand = new Hand();
    this._person = new Person();
  }

  public override async update(
    image:
      | ImageData
      | HTMLVideoElement
      | HTMLImageElement
      | HTMLCanvasElement
      | ImageBitmap
  ) {
    await super.update(image);

    this.pickPerson();
    this.pickHands();

    this.updateHandTrack();

    this.inferHandDirections();
  }

  private inferHandDirections() {
    for (let hand of this.bothHands) {
      if (!hand.handPose) continue;

      hand.palmFacingCamera =
        Vec3D.from2D(
          hand.handPose.keypoints.indexStart.kp2d.minus(
            hand.handPose.keypoints.wrist.kp2d
          )
        ).cross(
          Vec3D.from2D(
            hand.handPose.keypoints.pinkyStart.kp2d.minus(
              hand.handPose.keypoints.wrist.kp2d
            )
          )
        ).z < 0;
    }
    if (this.leftHand.handPose)
      this.leftHand.palmFacingCamera = !this.leftHand.palmFacingCamera;
  }

  private updateHandTrack() {
    for (let side of [
      {
        wrist: this._person.pose?.keypoints.leftWrist,
        hand: this._leftHand,
      },
      {
        wrist: this._person.pose?.keypoints.rightWrist,
        hand: this._rightHand,
      },
    ]) {
      if (side.hand.handPose) side.hand.seen();

      if (side.wrist && side.wrist.score > 0.2 && side.hand.handPose) {
        side.hand.wristOffset = side.hand.center.minus(side.wrist);
      } else if (!side.hand.handPose && side.wrist && side.wrist.score > 0.2) {
        // TODO: make this polar coords (angle + radius)
        side.hand.center = side.wrist.plus(side.hand.wristOffset);
        side.hand.tracked();
      }
    }
  }

  private poseFitness(pose: Pose) {
    // TODO: redo this and make it smarter! maybe use box and pose distance
    let score = 0;
    score += pose.score * this._config.posePicker.scoreMultiplier;
    score -=
      (Math.abs(pose.keypoints.nose.x - this.width / 2) / this.frameSize) *
      this._config.posePicker.centerDistanceMultiplier;
    return score;
  }

  private pickPerson() {
    this._person.pose = undefined;
    if (!this.poses || this.poses.length < 1) return;

    let fitnesses = [];
    for (let pose of this.poses) {
      fitnesses.push({ pose: pose, fitness: this.poseFitness(pose) });
    }
    fitnesses.sort((a, b) => b.fitness - a.fitness);
    this._person.pose = fitnesses[0].pose;

    if (fitnesses.length >= 2) {
      let a = fitnesses[0].pose;
      let b = fitnesses[1].pose;

      let distance = a.distance(b);
      // TODO: use box or smth, make it better
      if (distance > this._config.posePicker.maxPoseDistance) {
        console.warn('multiple people');
        this._person.pose = undefined;
      }
    }
  }

  private determineHandedness(hand: HandPose) {
    if (!this._person.pose)
      // TODO: Maybe this can use previous info or additional
      // heuristics like position on screen
      return (
        (hand.isPredictedLeftHand ? hand.score : -hand.score) *
        this._config.handPicker.rawScoreMultiplier
      );

    let wrist = hand.keypoints.wrist;
    let leftWrist = this._person.pose.keypoints.leftWrist;
    let rightWrist = this._person.pose.keypoints.rightWrist;

    let ldist = wrist.kp2d.distance(leftWrist);
    let rdist = wrist.kp2d.distance(rightWrist);

    let score = 0;

    score +=
      (hand.isPredictedLeftHand ? hand.score : -hand.score) *
      this._config.handPicker.handednessMultiplier;

    score +=
      rdist * this._config.handPicker.distanceMultiplier * rightWrist.score;
    score -=
      ldist * this._config.handPicker.distanceMultiplier * leftWrist.score;

    score +=
      (rdist - ldist) *
      this._config.handPicker.distanceDeltaMultiplier *
      rightWrist.score *
      leftWrist.score;

    return score;
  }

  private pickHands() {
    // TODO: Check if a hand is detected twice. If two hands are
    // very close together, one of them needs to be discarded

    this._leftHand.handPose = undefined;
    this._rightHand.handPose = undefined;

    if (!this._person.pose) return;
    // TODO: Still pick hands if no pose is detected, based on distance
    // to center or smth`

    let leftHands = [];
    let rightHands = [];

    for (let hand of this.hands) {
      if (this.determineHandedness(hand) >= 0) {
        leftHands.push(hand);
      } else {
        rightHands.push(hand);
      }
    }

    for (let side of [
      {
        wrist: this._person.pose.keypoints.leftWrist,
        list: leftHands,
        hand: this._leftHand,
      },
      {
        wrist: this._person.pose.keypoints.rightWrist,
        list: rightHands,
        hand: this._rightHand,
      },
    ]) {
      let minDist;
      let maxDist = this._config.handPicker.maxHandWristDistanceAccurate;
      if (side.wrist.score < this._config.handPicker.wristScoreThreshold) {
        side.wrist = this.leftHand.previousWrist || side.wrist;
        maxDist = this._config.handPicker.maxHandWristDistanceFuzzy;
      }
      for (let hand of side.list) {
        let wrist = hand.keypoints.wrist.kp2d;
        let dist = wrist.distance(side.wrist) / this.frameSize;
        if (dist > maxDist) continue;
        if (!minDist || minDist > dist) {
          minDist = dist;
          side.hand.handPose = hand;
          side.hand.previousWrist = side.wrist;
        }
      }
    }
  }
}

import { Component } from '@angular/core';

import * as hgr from '../mirror-hgr';
import P5 from 'p5';
import { Vec2D } from '../vec';

@Component({
  selector: 'app-test-mirror',
  templateUrl: './test-mirror.component.html',
  styleUrls: ['./test-mirror.component.scss'],
})
export class TestMirrorComponent {
  tracker: hgr.SinglePersonTracker;

  constructor() {
    this.tracker = new hgr.SinglePersonTracker();
    this.tracker.init();

    new P5(this.sketch);
  }

  gestureName: string = '';

  running: boolean = false;

  gestures: Map<string, hgr.HandGesture> = new Map();

  onStore() {
    if (!this.tracker.leftHand.handPose || this.gestureName.trim().length == 0)
      return;

    this.gestures.set(
      this.gestureName,
      hgr.HandGesture.fromHandPoseKeypoints(
        this.tracker.leftHand.handPose.keypoints
      )
    );
  }

  onStart() {
    this.running = !this.running;
  }

  private sketch = (p5: P5) => {
    let video: P5.Element;

    let videoReady = false;

    let width: number;
    let height: number;

    function readyToDraw() {
      return videoReady;
    }

    function drawPerson(person: hgr.Person) {
      if (!person.pose) return;
      let pose = person.pose;

      p5.fill(255, 255, 0);
      for (let kp of pose.keypoints.array) {
        if (kp.score > 0.2) {
          let p = transform(kp);
          p5.circle(p.x, p.y, transformValue(10));
        }
      }
    }

    function drawHands(hands: hgr.Hand[]) {
      for (let hand of hands) {
        p5.fill(255, 255, 0);
        for (let kp of hand.handPose?.keypoints.keypoints2D || []) {
          let p = transform(kp);
          p5.circle(p.x, p.y, transformValue(10));
        }
      }
    }

    let aspectRatio: number;
    let parent;

    p5.setup = async () => {
      video = p5.createCapture('VIDEO', () => {
        parent = document.querySelector('#mirror');
        if (!parent) return;
        aspectRatio = video.elt.width / video.elt.height;
        new ResizeObserver((entries) => {
          for (let e of entries) {
            if (e.contentBoxSize) {
              width = e.contentBoxSize[0].inlineSize;
              height = width / aspectRatio;
              p5.resizeCanvas(width, height);
            }
          }
        }).observe(parent);
        width = parent.getBoundingClientRect().width;
        height = width / aspectRatio;
        let canvas = p5.createCanvas(width, height);
        canvas.parent(parent);

        videoReady = true;
      });
      video.hide();
    };

    function transform(coord: Vec2D) {
      return new Vec2D(
        (coord.x / video.elt.width) * width,
        (coord.y / video.elt.height) * height
      );
    }

    function transformValue(value: number) {
      return (value / video.elt.height) * height;
    }

    p5.draw = async () => {
      if (!readyToDraw()) return;

      if (!this.running) {
        p5.image(video, 0, 0, width, height);
      } else {
        await this.tracker.update(video.elt);
        p5.image(video, 0, 0, width, height);

        drawPerson(this.tracker.person);
        drawHands(this.tracker.bothHands);

        for (let hand of this.tracker.bothHands) {
          let alphaLastSet = 255 - (Date.now() - hand.lastTracked) * 0.1;
          let alphaLastVisible =
            255 - (Date.now() - hand.lastSeen - 1000) * 0.1;

          let alpha = Math.min(alphaLastSet, alphaLastVisible);

          p5.fill(255, hand.palmFacingCamera ? 255 : 0, 0, alpha);
          let handCenter = transform(hand.center);
          p5.circle(handCenter.x, handCenter.y, transformValue(30));

          if (hand.handPose) {
            let currentGesture = hgr.HandGesture.fromHandPoseKeypoints(
              hand.handPose.keypoints
            );
            let closestGesture;
            let distance;

            for (let storedGesture of this.gestures) {
              let dist = storedGesture[1].distance(currentGesture);
              if (distance == undefined || distance > dist) {
                distance = dist;
                closestGesture = storedGesture;
              }
            }
            p5.fill(0, 0, 255);
            p5.textSize(transformValue(20));
            p5.text(closestGesture?.[0] || 'None', handCenter.x, handCenter.y);
          }
        }
      }
    };
  };
}

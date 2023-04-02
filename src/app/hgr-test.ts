import * as hgr from './mirror-hgr';
import P5 from 'p5';

const sketch = (p5: P5) => {
  let tracker: hgr.SinglePersonTracker;

  let video: P5.Element;

  let running = false;
  let videoReady = false;

  let gestures: Map<string, hgr.HandGesture> = new Map();

  function readyToDraw() {
    return videoReady;
  }

  function drawPerson(person: hgr.Person) {
    if (!person.pose) return;
    let pose = person.pose;

    p5.fill(255, 255, 0);
    for (let kp of pose.keypoints.array) {
      if (kp.score > 0.2) p5.circle(kp.x, kp.y, 10);
    }
  }

  function drawHands(hands: hgr.Hand[]) {
    for (let hand of hands) {
      p5.fill(255, 255, 0);
      for (let kp of hand.handPose?.keypoints.keypoints2D || []) {
        p5.circle(kp.x, kp.y, 10);
      }
    }
  }

  p5.setup = async () => {
    tracker = new hgr.SinglePersonTracker();

    await tracker.init();

    video = p5.createCapture('VIDEO', () => {
      p5.createCanvas(video.elt.width, video.elt.height);

      videoReady = true;
    });
    video.hide();

    let startBtn = p5.createButton(running ? 'Stop' : 'Start');
    startBtn.mouseClicked(() => {
      running = !running;
      startBtn.elt.innerHTML = running ? 'Stop' : 'Start';
    });

    let gestureInput = p5.createInput();

    p5.createButton('Store Gesture').mouseClicked(() => {
      if (!tracker.leftHand.handPose) return;
      gestures.set(
        gestureInput.value().toString(),
        hgr.HandGesture.fromHandPoseKeypoints(
          tracker.leftHand.handPose?.keypoints
        )
      );
    });
  };

  p5.draw = async () => {
    if (!readyToDraw()) return;

    p5.image(video, 0, 0);

    if (running) {
      await tracker.update(video.elt);

      drawPerson(tracker.person);
      drawHands(tracker.bothHands);

      for (let hand of tracker.bothHands) {
        let alphaLastSet = 255 - (Date.now() - hand.lastTracked) * 0.1;
        let alphaLastVisible = 255 - (Date.now() - hand.lastSeen - 1000) * 0.1;

        let alpha = Math.min(alphaLastSet, alphaLastVisible);

        p5.fill(255, hand.palmFacingCamera ? 255 : 0, 0, alpha);
        p5.circle(hand.center.x, hand.center.y, 30);

        if (hand.handPose) {
          let currentGesture = hgr.HandGesture.fromHandPoseKeypoints(
            hand.handPose.keypoints
          );
          let closestGesture;
          let distance;

          for (let storedGesture of gestures) {
            let dist = storedGesture[1].distance(currentGesture);
            if (distance == undefined || distance > dist) {
              distance = dist;
              closestGesture = storedGesture;
            }
          }
          p5.fill(0, 0, 255);
          p5.textSize(20);
          p5.text(closestGesture?.[0] || 'None', hand.center.x, hand.center.y);
        }
      }
    }
  };
};

new P5(sketch);

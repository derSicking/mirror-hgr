import * as hgr from './mirror-hgr';
import P5 from 'p5';

const sketch = (p5: P5) => {
  let tracker: hgr.SinglePersonTracker;

  let video: P5.Element;

  let running = false;
  let videoReady = false;

  const width = 1920;
  const height = 1080;

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

    p5.createCanvas(width, height);

    video = p5.createCapture('VIDEO', () => {
      video.size(width, height);
      videoReady = true;
    });
    video.hide();

    let startBtn = p5.createButton(running ? 'Stop' : 'Start');
    startBtn.mouseClicked(() => {
      running = !running;
      startBtn.elt.innerHTML = running ? 'Stop' : 'Start';
    });
  };

  p5.draw = async () => {
    if (!readyToDraw()) return;

    p5.image(video, 0, 0, width, height);

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
      }
    }
  };
};

new P5(sketch);

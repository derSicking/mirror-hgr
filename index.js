const width = 16 * 40
const height = 9 * 40

let video;
let frameSize;

let poseDetector;
let poses;

let handDetector;
let hands;

let initDone;
let videoDone;

async function init() {
	poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER });

	const model = handPoseDetection.SupportedModels.MediaPipeHands;
	const detectorConfig = {
		runtime: 'mediapipe', // or 'tfjs',
		solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
		modelType: 'full'
	}
	handDetector = await handPoseDetection.createDetector(model, detectorConfig);

	initDone = true;
}

async function setup() {
	createCanvas(width, height);
	video = createCapture(VIDEO, () => { videoDone = true; frameSize = Math.min(video.width, video.height) });
	video.hide();

	gestureInput = createInput("", "text");
	createButton("Store Gesture").mouseClicked(() => {
		storeGesture(gestureInput.elt.value, leftHand.hand);
	});

	await init();
}

async function getPoses() {
	poses = await poseDetector.estimatePoses(video.elt);
	hands = await handDetector.estimateHands(video.elt);
}

function readyToDraw() {
	return videoDone && initDone;
}

const fillColors = [
	[255, 0, 0],
	[0, 255, 0],
	[0, 255, 0],
	[255, 0, 0],
	[255, 0, 0],
	[255, 0, 0],
	[255, 0, 0],
	[255, 0, 0],
	[255, 0, 0],
	[255, 0, 255],
	[0, 0, 255],
	[255, 0, 0],
	[255, 0, 0],
	[255, 0, 0],
	[255, 0, 0],
	[255, 0, 0],
	[255, 0, 0],
]

function drawPoseKeypoints() {
	if (!poses || poses.length < 1) return;
	for (i = 0; i < 17; i++) {
		fill(fillColors[i]);
		let keypoint = poses[0].keypoints[i];
		if (keypoint.score < 0.2) continue;
		let x = (keypoint.x / 1920) * width;
		let y = (keypoint.y / 1080) * height;

		ellipse(x, y, 10);
	}
}

let leftHand = {}, rightHand = {};

function pickHands() {
	if (!poses || poses.length < 1) return;

	let leftWrist = poses[0].keypoints[9];
	let rightWrist = poses[0].keypoints[10];
	let compareWrist;

	leftHand.dist = 1000;
	rightHand.dist = 1000;

	for (let hand of hands) {
		let wrist = hand.keypoints[0];
		let selectedHand;

		// for some reason this is inverted
		if (hand.handedness === "Right") {
			compareWrist = leftWrist;
			selectedHand = leftHand;
		}
		else {
			compareWrist = rightWrist;
			selectedHand = rightHand;
		}

		let dx = Math.abs(wrist.x - compareWrist.x);
		let dy = Math.abs(wrist.y - compareWrist.y);
		let dist = Math.sqrt(dx * dx + dy * dy) / frameSize;

		if (dist < selectedHand.dist) {
			selectedHand.hand = hand;
			selectedHand.dist = dist;
		}
	}

	if (leftHand.dist == 1000) {
		leftHand.hand = undefined;
	}
	if (rightHand.dist == 1000) {
		rightHand.hand = undefined;
	}
}

function drawHandsKeypoints() {
	fill(255, 255, 0);
	let drawHands = [leftHand.hand, rightHand.hand];
	for (let hand of drawHands) {
		if (!hand) continue;
		for (j = 0; j < 21; j++) {
			let keypoint = hand.keypoints[j];
			if (keypoint.score < 0.2) continue;
			let x = (keypoint.x / 1920) * width;
			let y = (keypoint.y / 1080) * height;

			ellipse(x, y, 10);
		}
	}
}

async function draw() {
	if (!readyToDraw()) return;
	await getPoses();

	image(video, 0, 0, width, height);

	// check for hand poses closest to wrists of body pose, to select only relevant hands

	pickHands();

	// infer hand gesture type from 3d hand keypoints (eg. closed or open)

	let gestureLeft = detectGesture(leftHand.hand);
	let gestureRight = detectGesture(rightHand.hand);

	if (leftHand.hand) {
		let keypoint = leftHand.hand.keypoints[0];
		let x = (keypoint.x / 1920) * width;
		let y = (keypoint.y / 1080) * height;
		text(gestureLeft, x, y);
	}

	if (rightHand.hand) {
		let keypoint = rightHand.hand.keypoints[0];
		let x = (keypoint.x / 1920) * width;
		let y = (keypoint.y / 1080) * height;
		text(gestureRight, x, y);
	}

	// infer direction of hand (where is tha palm facing? where is the thumb?)
	// draw a digital twin of two hands using positional data from pose and hand keypoints
	// use motion, location and rotation of hands to call gesture events (like hold, swipe etc.)

	drawPoseKeypoints();

	drawHandsKeypoints();

}

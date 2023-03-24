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
	poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING });

	const model = handPoseDetection.SupportedModels.MediaPipeHands;
	const detectorConfig = {
		runtime: 'tfjs',
		modelType: 'full'
	};
	handDetector = await handPoseDetection.createDetector(model, detectorConfig);

	initDone = true;
}

async function setup() {
	createCanvas(width, height);
	video = createCapture(VIDEO, () => { videoDone = true; frameSize = Math.min(video.width, video.height) });
	video.hide();

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
	[0, 0, 255],
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

function drawHandsKeypoints() {
	fill(255, 255, 0);
	for (i = 0; i < hands.length; i++) {
		let hand = hands[i];
		for (j = 0; j < 21; j++) {
			let keypoint = hand.keypoints[j];
			if (keypoint.score < 0.2) continue;
			let x = (keypoint.x / 1920) * width;
			let y = (keypoint.y / 1080) * height;

			ellipse(x, y, 10);
		}
	}
}

let leftHand, rightHand;

function pickHands() {
	if (!poses || poses.length < 1) return;

	let leftWrist = poses[0].keypoints[9];
	let rightWrist = poses[0].keypoints[10];
	let compareWrist;

	for (let hand of hands) {
		let wrist = hand.keypoints[0];

		if (hand.handedness === "Right") compareWrist = leftWrist
		else compareWrist = rightWrist;

		let dx = Math.abs(wrist.x - compareWrist.x);
		let dy = Math.abs(wrist.y - compareWrist.y);
		let dist = Math.sqrt(dx * dx + dy * dy);
		let distRatio = dist / frameSize;

		console.log(distRatio);
	}
}

async function draw() {
	if (!readyToDraw()) return;
	await getPoses();

	// check for hand poses closest to wrists of body pose, to select only relevant hands

	pickHands();

	// infer hand gesture type from 3d hand keypoints (eg. closed or open)
	// infer direction of hand (where is tha palm facing? where is the thumb?)
	// draw a digital twin of two hands using positional data from pose and hand keypoints
	// use motion, location and rotation of hands to call gesture events (like hold, swipe etc.)

	image(video, 0, 0, width, height);
	drawPoseKeypoints();

	drawHandsKeypoints();

}

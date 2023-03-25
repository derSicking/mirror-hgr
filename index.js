let video;
let frameSize;

let poseDetector;
let poses;

let handDetector;
let hands;

let initDone;
let videoDone;

async function init() {
	poseDetector = await poseDetection.createDetector(poseDetection.SupportedModels.MoveNet, { modelType: poseDetection.movenet.modelType.MULTIPOSE_LIGHTNING });

	const model = handPoseDetection.SupportedModels.MediaPipeHands;
	const detectorConfig = {
		runtime: 'mediapipe', // or 'tfjs',
		solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
		modelType: 'full',
		maxHands: 4
	}
	handDetector = await handPoseDetection.createDetector(model, detectorConfig);

	initDone = true;
}

let stop = true;

let width, height;

async function setup() {
	video = createCapture(VIDEO, () => {
		width = video.width;
		height = video.height;
		frameSize = Math.max(width, height);
		createCanvas(width, height);
		videoDone = true;
	});
	video.hide();

	gestureInput = createInput("", "text");
	createButton("Store Gesture").mouseClicked(() => {
		storeGesture(gestureInput.elt.value, leftHand.hand);
	});

	let stopBtn = createButton(!stop ? "Stop" : "Start");
	stopBtn.mouseClicked(() => {
		let name = stop ? "Stop" : "Start";
		stopBtn.elt.name = name;
		stopBtn.elt.innerHTML = name;
		stop = !stop;
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
	let drawPoses = [person.pose];
	// let drawPoses = poses;
	for (let pose of drawPoses) {
		if (!pose) continue;
		for (i = 0; i < 17; i++) {
			fill(fillColors[i]);
			let keypoint = pose.keypoints[i];
			if (keypoint.score < 0.2) continue;
			let x = keypoint.x;
			let y = keypoint.y;

			ellipse(x, y, 10);
		}
	}
}

let leftHand = {}, rightHand = {};

// TODO: Add max dist (Can a hand belong to a wrist when it is X distance away?)

const wristScoreThreshold = 0.2;
const maxHandWristDistanceAccurate = 0.2;
const maxHandWristDistanceFuzzy = 0.4;

const rawScoreMultiplier = 2.0;
const handednessMultiplier = 1.0;
const distanceMultiplier = 70.0;
const distanceDeltaMultiplier = 70.0;

function handFitness(hand) {
	if (!person.pose) return hand.handedness === "Right" ? hand.score * rawScoreMultiplier : - hand.score * rawScoreMultiplier;

	let wrist = hand.keypoints[0];
	let leftWrist = person.pose.keypoints[9];
	let rightWrist = person.pose.keypoints[10];

	let dx = wrist.x - leftWrist.x;
	let dy = wrist.y - leftWrist.y;
	let ldist = Math.sqrt(dx * dx + dy * dy) / frameSize;

	dx = wrist.x - rightWrist.x;
	dy = wrist.y - rightWrist.y;
	let rdist = Math.sqrt(dx * dx + dy * dy) / frameSize;

	let score = 0;

	// - being left handed with a very high score (actually inverted)
	if (hand.handedness === "Right") {
		score += hand.score * handednessMultiplier;
	} else {
		score -= hand.score * handednessMultiplier;
	}

	// - being left handed with a reasonable score and close to the left wrist with a reasonable score
	// - being close to the left wrist, if it has a very high score
	score += rdist * distanceMultiplier * rightWrist.score;
	score -= ldist * distanceMultiplier * leftWrist.score;

	// - being closer to the left than to the right wrist, if both have high scores
	// - being left handed with a reasonable score and far from the right wrist with a high score
	score += (rdist - ldist) * distanceDeltaMultiplier * rightWrist.score * leftWrist.score;

	// - being close to the previous left hand or wrist position, if that is recent
	// TODO: Add this ^^

	return score;

}

function pickHands() {
	if (!person.pose) return;

	let leftWrist = person.pose.keypoints[9];
	let rightWrist = person.pose.keypoints[10];

	leftHand.dist = 1000;
	rightHand.dist = 1000;

	for (let compareWrist of [leftWrist, rightWrist]) {
		for (let hand of hands) {
			let wrist = hand.keypoints[0];
			let selectedHand;
			let maxDist = maxHandWristDistanceAccurate;

			// The predicted handedness is sometimes wrong!

			// What data do i have?
			// - handedness with score
			// - distance to right wrist with score
			// - distance to left wrist with score
			// - previous hand and wrist positions

			// What makes a hand a left hand?
			// - being left handed with a very high score (actually inverted)
			// - being left handed with a reasonable score and close to the left wrist with a reasonable score
			// - being close to the left wrist, if it has a very high score
			// - being closer to the left than to the right wrist, if both have high scores
			// - being left handed with a reasonable score and far from the right wrist with a high score
			// - being close to the previous left hand or wrist position, if that is recent

			if (handFitness(hand) >= 0) {
				compareWrist = leftWrist;
				selectedHand = leftHand;
			}
			else {
				compareWrist = rightWrist;
				selectedHand = rightHand;
			}

			if (compareWrist.score < wristScoreThreshold) {
				// pose wrist cant be trusted
				// use a previous wrist location
				if (selectedHand.previousWrist) compareWrist = selectedHand.previousWrist;
				maxDist = maxHandWristDistanceFuzzy;
			}

			let dx = wrist.x - compareWrist.x;
			let dy = wrist.y - compareWrist.y;
			let dist = Math.sqrt(dx * dx + dy * dy) / frameSize;

			if (dist > maxDist) {
				continue;
			}

			if (dist < selectedHand.dist) {
				selectedHand.hand = hand;
				selectedHand.dist = dist;
				selectedHand.previousWrist = compareWrist;
			}
		}
	}

	if (leftHand.dist == 1000) {
		leftHand.hand = undefined;
	}
	if (rightHand.dist == 1000) {
		rightHand.hand = undefined;
	}
}

const poseScoreMultiplier = 1.0;
const poseCenterMultiplier = 2.0;

const minFitnessOffset = 0.2;
const maxPoseDistance = 0.1;

function poseFitness(pose) {
	let score = 0;

	score += pose.score * poseScoreMultiplier;

	score -= (Math.abs(pose.keypoints[0].x - width / 2) / frameSize) * poseCenterMultiplier;

	return score;
}

let person = {};

function pickPerson() {
	if (!poses || poses.length < 1) {
		person.pose = undefined;
		return;
	}

	let fitnesses = [];

	person.pose = undefined;
	let fittest = -999999;
	for (let pose of poses) {
		let fit = poseFitness(pose);
		if (fit > fittest) {
			person.pose = pose;
			fittest = fit;
		}
		fitnesses.push({ pose: pose, fit: fit });
	}

	if (fitnesses.length >= 2) {
		fitnesses.sort((a, b) => b.fit - a.fit);

		let a = fitnesses[0].pose;
		let b = fitnesses[1].pose;

		let dx = a.keypoints[0].x - b.keypoints[0].x;
		let dy = a.keypoints[0].y - b.keypoints[0].y;
		let dist = Math.sqrt(dx * dx + dy * dy);

		let dfit = fitnesses[0].fit - fitnesses[1].fit;

		if (dist > maxPoseDistance && dfit < minFitnessOffset) {
			console.log("multiple people");
			person.pose = undefined;
		}
	}
}

function drawHandsKeypoints() {
	let drawHands = [leftHand.hand, rightHand.hand];
	// let drawHands = hands;
	for (let hand of drawHands) {
		if (!hand) continue;
		fill(255, 255, 0, 64);
		if (hand == leftHand.hand) {
			fill(255, 128, 0);
		} else if (hand == rightHand.hand) {
			fill(128, 255, 0);
		}
		for (j = 0; j < 21; j++) {
			let keypoint = hand.keypoints[j];
			if (keypoint.score < 0.2) continue;
			let x = keypoint.x;
			let y = keypoint.y;

			ellipse(x, y, 10);
		}
	}
}

async function draw() {
	if (!readyToDraw()) return;

	image(video, 0, 0, width, height);

	if (!stop) {

		await getPoses();

		// check for hand poses closest to wrists of body pose, to select only relevant hands

		pickPerson();
		pickHands();

		// infer hand gesture type from 3d hand keypoints (eg. closed or open)

		let gestureLeft = detectGesture(leftHand.hand);
		let gestureRight = detectGesture(rightHand.hand);

		if (leftHand.hand) {
			let keypoint = leftHand.hand.keypoints[0];
			let x = keypoint.x;
			let y = keypoint.y;
			text(gestureLeft, x, y);
		}

		if (rightHand.hand) {
			let keypoint = rightHand.hand.keypoints[0];
			let x = keypoint.x;
			let y = keypoint.y;
			text(gestureRight, x, y);
		}

		// infer direction of hand (where is tha palm facing? where is the thumb?)

		// calculateDirections()

		// draw a digital twin of two hands using positional data from pose and hand keypoints
		// use motion, location and rotation of hands to call gesture events (like hold, swipe etc.)

		drawPoseKeypoints();

		drawHandsKeypoints();
	}

}

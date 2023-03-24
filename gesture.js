function calculateAngle(a, b, c) {
	// i am interested in the angle between ba and bc
	// first, find ba and bc as vectors

	let ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
	let bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

	// normalize by scaling with 1/length

	let lba = Math.sqrt(ba.x * ba.x + ba.y * ba.y + ba.z * ba.z);
	let lbc = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z);

	let nba = { x: ba.x / lba, y: ba.y / lba, z: ba.z / lba };
	let nbc = { x: bc.x / lbc, y: bc.y / lbc, z: bc.z / lbc };

	// calculate dot product of normalized vectors

	let dot = nba.x * nbc.x + nba.y * nbc.y + nba.z * nbc.z;

	return Math.acos(dot);
}

function calculateAngles(wrist, fingers) {
	// TODO: Add angles between adjacent fingers (crossed fingers vs. Schwurhand vs. victory)
	for (let finger of fingers) {
		for (let joint = 0; joint < 3; joint++) {
			let base = wrist;
			if (joint > 0) base = finger[joint - 1];
			let target = finger[joint + 1];
			finger[joint].angle = calculateAngle(base.keypoint3D, finger[joint].keypoint3D, target.keypoint3D);
		}
	}
}

function getWrist(hand) {
	if (!hand) return;
	let kp = hand.keypoints;
	let kp3d = hand.keypoints3D;
	return { keypoint: kp[0], keypoint3D: kp3d[0] };
}

function getFingers(hand) {
	if (!hand) return;
	let kp = hand.keypoints;
	let kp3d = hand.keypoints3D;
	let fingers = [];
	for (let finger = 0; finger < 5; finger++) {
		let joints = [];
		for (let joint = 0; joint < 4; joint++) {
			joints.push({ keypoint: kp[finger * 4 + joint + 1], keypoint3D: kp3d[finger * 4 + joint + 1] });
		}
		fingers.push(joints);
	}
	calculateAngles(getWrist(hand), fingers);
	return fingers;
}

function getGestureAngles(fingers) {
	let gestureAngles = [];
	for (let finger of fingers) {
		for (let joint = 0; joint < 3; joint++) {
			gestureAngles.push(finger[joint].angle);
		}
	}
	return gestureAngles;
}

const gestures = new Map();

function storeGesture(name, hand) {
	if (!hand || !name) return;

	let gesture = [];
	if (gestures.has(name)) {
		gesture = gestures.get(name);
	}
	gesture.push(getGestureAngles(getFingers(hand)));
	gestures.set(name, gesture);
}

function gestureDistance(a, b) {
	if (a.length != b.length) return;
	let acc = 0;
	for (let i = 0; i < a.length; i++) {
		let x = a[i] - b[i];
		acc += x * x;
	}
	return Math.sqrt(acc);
}

function detectGesture(hand) {
	if (!hand) return;

	let fingers = getFingers(hand);

	minDist = 1000000.0;
	minName = "None";

	// TODO: Optimize by splitting up and referencing gestures by the gesture space, not by their names.
	// This way, a forEach will not be necessary, only the space close to the current gesture needs to be searched.

	gestures.forEach((value, key) => {
		for (let i = 0; i < value.length; i++) {
			let dist = gestureDistance(value[i], getGestureAngles(fingers));
			if (dist < minDist) {
				minDist = dist;
				minName = key;
			}
		}
	});

	return minName;
}

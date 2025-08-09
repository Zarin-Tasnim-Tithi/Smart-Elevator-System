const floorHeight = 100;
let currentFloor = 1;
let isMoving = false;
let isEmergency = false;

const floorDisplay = document.getElementById("floorDisplay");
const floorTime = document.getElementById("floorTime");
const queueDisplay = document.getElementById("queue");
const elevator = document.getElementById("elevator");
const emergencyBtn = document.getElementById("emergencyBtn");
const dingSound = new Audio("ding.mp3");

let mlfq = {
  admin: [],
  vip: [],
  user: []
};

document.body.addEventListener("click", () => {
  dingSound.play().then(() => {
    dingSound.pause();
    dingSound.currentTime = 0;
  }).catch(() => {});
}, { once: true });

document.querySelectorAll(".floor-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const floor = parseInt(btn.dataset.floor);
    const role = document.getElementById("selectedRole").value || "user";

    if (!isRequestInMLFQ(floor) && floor !== currentFloor && !isEmergency) {
      const request = {
        floor: floor,
        role: role,
        time: Date.now(),
        distance: Math.abs(currentFloor - floor)
      };
      mlfq[role].push(request);
      updateQueueDisplay();
      processQueue();
    }
  });
});

document.querySelectorAll(".role-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".role-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    const role = btn.dataset.role;
    document.getElementById("selectedRole").value = role;
    greetRole(role);
  });
});

emergencyBtn.addEventListener("click", () => {
  isEmergency = !isEmergency;
  emergencyBtn.textContent = isEmergency ? "Exit Emergency Mode" : "Enter Emergency Mode";
  document.body.classList.toggle("night-mode", isEmergency);
  if (!isEmergency) processQueue();
});

function greetRole(role) {
  const greetings = {
    user: "Good morning student",
    vip: "As salamualai kum teacher, welcome!",
    admin: "As salamualai kum , welcome to IIUC"
  };
  const message = greetings[role] || "Welcome";
  speak(message);
}

function speak(message) {
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(message);
  synth.cancel();
  synth.speak(utter);
}

function updateQueueDisplay() {
  const allRequests = [...mlfq.admin, ...mlfq.vip, ...mlfq.user];
  if (allRequests.length === 0) {
    queueDisplay.textContent = "Empty";
  } else {
    queueDisplay.textContent = allRequests.map(req => `${req.floor} (${req.role})`).join(", ");
  }
}

function isRequestInMLFQ(floor) {
  return [...mlfq.admin, ...mlfq.vip, ...mlfq.user].some(req => req.floor === floor);
}

function getNextRequest() {
  const priorityLevels = ["admin", "vip", "user"];
  for (let level of priorityLevels) {
    if (mlfq[level].length > 0) {
      // Sort within same queue: closest floor, then earliest request
      mlfq[level].sort((a, b) => {
        const distA = Math.abs(currentFloor - a.floor);
        const distB = Math.abs(currentFloor - b.floor);
        if (distA !== distB) return distA - distB;
        return a.time - b.time;
      });
      return mlfq[level].shift(); // Remove and return
    }
  }
  return null;
}

async function processQueue() {
  if (isMoving || isEmergency) return;

  const nextRequest = getNextRequest();
  if (!nextRequest) return;

  isMoving = true;
  updateQueueDisplay();

  const nextFloor = nextRequest.floor;
  const floorDiff = Math.abs(nextFloor - currentFloor);
  const travelTime = floorDiff * 1000;

  elevator.style.bottom = `${(nextFloor - 1) * floorHeight}px`;
  await wait(travelTime);

  currentFloor = nextFloor;
  floorDisplay.textContent = currentFloor;
  floorTime.textContent = new Date().toLocaleTimeString();

  await wait(300);
  playDing();

  await openDoors();
  await wait(1000);
  await closeDoors();

  isMoving = false;
  processQueue();
}

function playDing() {
  dingSound.pause();
  dingSound.currentTime = 0;
  dingSound.play().catch(() => {});
}

function openDoors() {
  elevator.classList.add("doors-open");
  return wait(1000);
}

function closeDoors() {
  elevator.classList.remove("doors-open");
  return wait(1000);
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

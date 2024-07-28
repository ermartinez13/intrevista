import "./style.css";

const videoElem = document.getElementById("video");
const startBtn = document.getElementById("startButton");
const stopBtn = document.getElementById("stopButton");
const saveBtn = document.getElementById("saveButton");

let data = [];
let mediaRecorder = null;
let db = null;

const DB_NAME = "IntrevistaDB";
const DB_VERSION = 1;

const dbRequest = indexedDB.open(DB_NAME, DB_VERSION);

startBtn.addEventListener("click", handleStart);
stopBtn.addEventListener("click", handleStop);
dbRequest.addEventListener("error", console.error);
dbRequest.addEventListener("success", (event) => {
  db = event.target.result;
});
dbRequest.addEventListener("upgradeneeded", (event) => {
  const db = event.target.result;
  db.createObjectStore("videos", { autoIncrement: true });
});
saveBtn.addEventListener("click", handleSaveRecording);

function handleStart() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then(showInputStream)
    .then(startRecording)
    .catch((error) => {
      if (error.name === "NotFoundError") {
        console.error("Camera or microphone not found. Can't record.");
      } else {
        console.error(error);
      }
    });
}

function showInputStream(stream) {
  videoElem.srcObject = stream;
  videoElem.captureStream =
    videoElem.captureStream || videoElem.mozCaptureStream;
  stopBtn.removeAttribute("disabled");
  startBtn.setAttribute("disabled", "");
  return videoElem.play();
}

function startRecording() {
  data = []; // reset data
  saveBtn.setAttribute("disabled", "");
  const stream = videoElem.captureStream();
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: "video/webm",
  });
  mediaRecorder.ondataavailable = (event) => data.push(event.data);
  mediaRecorder.onerror = (error) => console.error("Recording Error: ", error);
  mediaRecorder.start();
}

function handleStop() {
  videoElem.srcObject.getTracks().forEach((track) => track.stop());
  mediaRecorder.stop();
  mediaRecorder = null;
  videoElem.srcObject = null;
  startBtn.removeAttribute("disabled");
  stopBtn.setAttribute("disabled", "");
  setTimeout(enableRecordingPlayback, 0); // allows processing of MediaRecorder's datavailable event
}

function enableRecordingPlayback() {
  const recordingBlob = new Blob(data, { type: "video/webm" });
  videoElem.src = URL.createObjectURL(recordingBlob);
  videoElem.setAttribute("controls", "");
  videoElem.muted = false;
  saveBtn.removeAttribute("disabled");
}

function handleSaveRecording() {
  if (db) {
    const recordingBlob = new Blob(data, { type: "video/webm" });
    const transaction = db.transaction(["videos"], "readwrite");
    const objectStore = transaction.objectStore("videos");
    const request = objectStore.add(recordingBlob);
    request.onsuccess = () => {
      saveBtn.setAttribute("disabled", "");
      saveBtn.textContent = "Saved!";
    };
  }
}

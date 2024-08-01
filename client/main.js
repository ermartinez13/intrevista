import "./style.css";

const videoElem = document.getElementById("video");
const startBtn = document.getElementById("start-button");
const stopBtn = document.getElementById("stop-button");
const saveBtn = document.getElementById("save-button");
const recordingList = document.getElementById("recordings");

let data = [];
let mediaRecorder = null;
let db = null;

const DB_NAME = "IntrevistaDB";
const DB_VERSION = 1;
const VIDEO_STORE = "videos";

const dbRequest = indexedDB.open(DB_NAME, DB_VERSION);

startBtn.addEventListener("click", handleStartRecording);
stopBtn.addEventListener("click", handleStopRecording);
dbRequest.addEventListener("error", console.error);
dbRequest.addEventListener("success", handleDBConnection);
dbRequest.addEventListener("upgradeneeded", handleDBUpgrade);
saveBtn.addEventListener("click", handleSaveRecording);
recordingList.addEventListener("click", setPlaybackSource);

function handleStartRecording() {
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
  mediaRecorder.onstop = enableRecordingPlayback;
  mediaRecorder.start();
}

function handleStopRecording() {
  videoElem.srcObject.getTracks().forEach((track) => track.stop());
  mediaRecorder.stop();
  mediaRecorder = null;
  videoElem.srcObject = null;
  startBtn.removeAttribute("disabled");
  stopBtn.setAttribute("disabled", "");
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
    const transaction = db.transaction([VIDEO_STORE], "readwrite");
    const objectStore = transaction.objectStore(VIDEO_STORE);
    const request = objectStore.add(recordingBlob);
    request.onsuccess = () => {
      saveBtn.setAttribute("disabled", "");
      saveBtn.textContent = "Saved!";
    };
  }
}

function getRecordings(successHandler) {
  const transaction = db.transaction([VIDEO_STORE], "readonly");

  transaction.onerror = (event) => {
    console.error(
      "Recording retrieval transaction error: ",
      event.target.error
    );
  };

  const objectStore = transaction.objectStore(VIDEO_STORE);
  const request = objectStore.getAll();

  request.onsuccess = (event) => {
    const recordings = event.target.result;
    successHandler(recordings);
  };
}

function renderRecordings(recordings) {
  recordings.forEach((recording) => {
    const recordingURL = URL.createObjectURL(recording);
    const listItemElem = document.createElement("li");
    const buttonElem = document.createElement("button");
    buttonElem.textContent = "Play";
    buttonElem.setAttribute("data-url", recordingURL);
    listItemElem.appendChild(buttonElem);
    recordingList.appendChild(listItemElem);
  });
}

function setPlaybackSource(event) {
  const targetElem = event.target;
  if (targetElem.tagName === "BUTTON") {
    const recordingURL = targetElem.getAttribute("data-url");
    videoElem.src = recordingURL;
    videoElem.setAttribute("controls", "");
    videoElem.muted = false;
  }
}

function handleDBUpgrade(event) {
  const db = event.target.result;
  db.createObjectStore(VIDEO_STORE, { autoIncrement: true });
}

function handleDBConnection(event) {
  db = event.target.result;
  getRecordings(renderRecordings);
}

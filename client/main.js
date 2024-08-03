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
const DB_VERSION = 2;
const VIDEO_STORE = "videos";
const METADATA_STORE = "metadata";

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
    const transaction = db.transaction(
      [VIDEO_STORE, METADATA_STORE],
      "readwrite"
    );
    const objectStore = transaction.objectStore(VIDEO_STORE);
    const request = objectStore.add(recordingBlob);
    request.onsuccess = (event) => {
      const videoKey = event.target.result;
      const timestamp = new Date();
      const metadataStore = transaction.objectStore(METADATA_STORE);
      const metadata = {
        videoKey,
        createdAt: timestamp,
        description: "",
        title: "untitled",
        updatedAt: timestamp,
      };
      const metadataRequest = metadataStore.add(metadata);
      metadataRequest.onerror = (event) => {
        console.error("Metadata save error: ", event.target.error);
      };
      saveBtn.setAttribute("disabled", "");
      saveBtn.textContent = "Saved!";
      metadataRequest.onsuccess = () => appendMetadataToList(metadata);
    };
  }
}

function getMetadataList(successHandler) {
  const transaction = db.transaction([METADATA_STORE], "readonly");

  transaction.onerror = (event) => {
    console.error("Metadata retrieval transaction error: ", event.target.error);
  };

  const metadataStore = transaction.objectStore(METADATA_STORE);
  const request = metadataStore.getAll();

  request.onsuccess = (event) => {
    const metadataList = event.target.result;
    successHandler(metadataList);
  };
}

function renderMetadata(metadataList) {
  metadataList.forEach((metadata) => {
    appendMetadataToList(metadata);
  });
}

function appendMetadataToList(metadata) {
  const listItemElem = document.createElement("li");
  const buttonElem = document.createElement("button");
  const descriptionElem = document.createElement("p");
  const titleElem = document.createElement("p");
  buttonElem.textContent = `Play ${metadata.videoKey}`;
  descriptionElem.textContent = `Recorded on: ${metadata.createdAt}`;
  titleElem.textContent = `${metadata.title} (${metadata.videoKey})`;
  buttonElem.setAttribute("data-video-key", metadata.videoKey);
  listItemElem.appendChild(titleElem);
  listItemElem.appendChild(descriptionElem);
  listItemElem.appendChild(buttonElem);
  recordingList.appendChild(listItemElem);
}

function setPlaybackSource(event) {
  const targetElem = event.target;
  if (targetElem.tagName === "BUTTON") {
    const videoKey = targetElem.getAttribute("data-video-key");
    const transaction = db.transaction(VIDEO_STORE, "readonly");
    const request = transaction.objectStore(VIDEO_STORE).get(Number(videoKey));
    request.onsuccess = (event) => {
      const recordingBlob = event.target.result;
      const recordingURL = URL.createObjectURL(recordingBlob);
      videoElem.src = recordingURL;
      videoElem.setAttribute("controls", "");
      videoElem.muted = false;
    };
  }
}

function handleDBUpgrade(event) {
  const db = event.target.result;
  const storeNames = db.objectStoreNames;

  if (!storeNames.contains(VIDEO_STORE)) {
    db.createObjectStore(VIDEO_STORE, { autoIncrement: true });
  }
  if (!storeNames.contains(METADATA_STORE)) {
    db.createObjectStore(METADATA_STORE, { autoIncrement: true });
  }
}

function handleDBConnection(event) {
  db = event.target.result;
  getMetadataList(renderMetadata);
}

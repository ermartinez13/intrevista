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
const METADATA_STORE = "metadata";
let contentEdit = null;

const dbRequest = indexedDB.open(DB_NAME, DB_VERSION);

startBtn.addEventListener("click", handleStartRecording);
stopBtn.addEventListener("click", handleStopRecording);
dbRequest.addEventListener("error", console.error);
dbRequest.addEventListener("success", handleDBConnection);
dbRequest.addEventListener("upgradeneeded", handleDBUpgrade);
saveBtn.addEventListener("click", handleSaveRecording);
recordingList.addEventListener("click", handlePlayDeleteActions);
recordingList.addEventListener("focusin", setEditTarget);
recordingList.addEventListener("focusout", persistChanges);

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
  videoElem.removeAttribute("controls");
  videoElem.muted = true;
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
  request.onerror = console.error;
}

function insertMetadata(metadataList) {
  metadataList.forEach((metadata) => {
    appendMetadataToList(metadata);
  });
}

function replaceMetadata(metadataList) {
  recordingList.innerHTML = null;
  metadataList.forEach((metadata) => {
    appendMetadataToList(metadata);
  });
}

function appendMetadataToList(metadata) {
  const listItemElem = document.createElement("li");
  const playButton = document.createElement("button");
  const deleteButton = document.createElement("button");
  const createdAtElem = document.createElement("p");
  const titleElem = document.createElement("p");
  const descriptionElem = document.createElement("textarea");
  const dataAttrPrefix = `${metadata.videoKey}-`;
  playButton.textContent = `Play ${metadata.videoKey}`;
  deleteButton.textContent = `Delete ${metadata.videoKey}`;
  createdAtElem.textContent = `Created: ${new Date(
    metadata.createdAt
  ).toLocaleString()}`;
  titleElem.textContent = metadata.title;
  playButton.setAttribute("data-key-action", `${metadata.videoKey}-play`);
  deleteButton.setAttribute("data-key-action", `${metadata.videoKey}-delete`);
  titleElem.setAttribute("contenteditable", "");
  descriptionElem.textContent = metadata.description;
  titleElem.setAttribute("data-editable", dataAttrPrefix + "title");
  descriptionElem.setAttribute("data-editable", dataAttrPrefix + "description");
  listItemElem.appendChild(titleElem);
  listItemElem.appendChild(createdAtElem);
  listItemElem.appendChild(descriptionElem);
  listItemElem.appendChild(playButton);
  listItemElem.appendChild(deleteButton);
  recordingList.appendChild(listItemElem);
}

function handlePlayDeleteActions(event) {
  const targetElem = event.target;
  if (targetElem.tagName === "BUTTON") {
    const [key, action] = targetElem.getAttribute("data-key-action").split("-");
    const videoKey = Number(key);
    const transaction = db.transaction(
      [VIDEO_STORE, METADATA_STORE],
      "readwrite"
    );
    const videoStore = transaction.objectStore(VIDEO_STORE);

    transaction.oncomplete = () => {
      getMetadataList(replaceMetadata);
    };
    transaction.onerror = console.error;

    if (action === "play") {
      const request = videoStore.get(videoKey);
      request.onsuccess = (event) => {
        const recordingBlob = event.target.result;
        const recordingURL = URL.createObjectURL(recordingBlob);
        videoElem.src = recordingURL;
        videoElem.setAttribute("controls", "");
        videoElem.muted = false;
      };
    }

    if (action === "delete") {
      const metadataStore = transaction.objectStore(METADATA_STORE);
      const metadataDeleteRequest = metadataStore.delete(videoKey);
      metadataDeleteRequest.onsuccess = () => {
        const videoDeleteRequest = videoStore.delete(videoKey);
        videoDeleteRequest.onerror = console.error;
      };
      metadataDeleteRequest.onerror = console.error;
    }
  }
}

function handleDBUpgrade(event) {
  const db = event.target.result;
  const storeNames = db.objectStoreNames;

  if (!storeNames.contains(VIDEO_STORE)) {
    db.createObjectStore(VIDEO_STORE, { autoIncrement: true });
  }
  if (!storeNames.contains(METADATA_STORE)) {
    db.createObjectStore(METADATA_STORE, { keyPath: "videoKey" });
  }
}

function handleDBConnection(event) {
  db = event.target.result;
  getMetadataList(insertMetadata);
}

function setEditTarget(event) {
  const target = event.target;
  const editableElems = ["P", "TEXTAREA"];
  if (editableElems.includes(target.tagName)) {
    const dataEditable = target.getAttribute("data-editable");
    const originalContent = target.textContent;
    if (dataEditable) {
      const [videoKey, property] = dataEditable.split("-");
      contentEdit = {
        property,
        videoKey,
        originalContent,
      };
    }
  }
}

function persistChanges(event) {
  const target = event.target;
  const editableElems = ["P", "TEXTAREA"];
  if (editableElems.includes(target.tagName)) {
    const dataEditable = target.getAttribute("data-editable");
    if (dataEditable) {
      const [videoKey, property] = dataEditable.split("-");
      const editedContent =
        target.tagName === "TEXTAREA" ? target.value : target.textContent;
      if (contentEdit.originalContent === editedContent) {
        return;
      }
      const transaction = db.transaction([METADATA_STORE], "readwrite");
      const request = transaction.objectStore("metadata").get(Number(videoKey));
      request.onsuccess = () => {
        const metadata = request.result;
        metadata[property] = editedContent;
        const putRequest = transaction.objectStore("metadata").put(metadata);
        putRequest.onerror = () => {
          target.setContent = contentEdit.originalContent;
        };
        putRequest.onsuccess = () => {
          contentEdit = null;
        };
      };
    }
  }
}

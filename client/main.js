import "./style.css";

const videoElem = document.getElementById("video");
const startBtn = document.getElementById("startButton");
const stopBtn = document.getElementById("stopButton");

let data = [];
let mediaRecorder = null;

startBtn.addEventListener("click", handleStart);
stopBtn.addEventListener("click", handleStop);

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
}

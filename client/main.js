import "./style.css";

const videoElem = document.getElementById("video");
const startBtn = document.getElementById("startButton");
const stopBtn = document.getElementById("stopButton");

let webcamStream = null;

startBtn.addEventListener("click", handleStart);
stopBtn.addEventListener("click", handleStop);

function handleStart() {
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: true,
    })
    .then(showInputStream)
    .catch((error) => {
      if (error.name === "NotFoundError") {
        console.error("Camera or microphone not found. Can't record.");
      } else {
        console.error(error);
      }
    });
}

function showInputStream(stream) {
  webcamStream = stream;
  videoElem.srcObject = stream;
  videoElem.captureStream =
    videoElem.captureStream || videoElem.mozCaptureStream;
  stopBtn.removeAttribute("disabled");
  startBtn.setAttribute("disabled", "");
  return videoElem.play();
}

function handleStop() {
  if (webcamStream) {
    webcamStream.getTracks().forEach((track) => track.stop());
    webcamStream = null;
    startBtn.removeAttribute("disabled");
    stopBtn.setAttribute("disabled", "");
  }
}

import "./style.css";

const videoElem = document.getElementById("video");
const startBtn = document.getElementById("startButton");
const stopBtn = document.getElementById("stopButton");

startBtn.addEventListener("click", handleStart);

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
  videoElem.srcObject = stream;
  videoElem.captureStream =
    videoElem.captureStream || videoElem.mozCaptureStream;
  return videoElem.play();
}

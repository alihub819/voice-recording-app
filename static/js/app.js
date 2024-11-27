// static/js/app.js

let audioContext;
let recorder;
let stream;
let chunks = [];

const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const submitButton = document.getElementById('submitButton');
const audioPlayback = document.getElementById('audioPlayback');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');

recordButton.addEventListener('click', startRecording);
stopButton.addEventListener('click', stopRecording);
submitButton.addEventListener('click', submitRecording);

async function startRecording() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);

    // Visualize the audio
    visualize(source);

    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => chunks.push(e.data);
    recorder.start();

    recordButton.disabled = true;
    stopButton.disabled = false;
  } catch (err) {
    console.error('Error accessing microphone:', err);
  }
}

function stopRecording() {
  recorder.stop();
  stream.getTracks().forEach((track) => track.stop());
  audioContext.close();

  stopButton.disabled = true;
  submitButton.disabled = false;

  const blob = new Blob(chunks, { type: 'audio/webm; codecs=opus' });
  const audioURL = URL.createObjectURL(blob);
  audioPlayback.src = audioURL;
}

function visualize(source) {
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  source.connect(analyser);

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = '#fff';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = '#ff7e5f';

    canvasCtx.beginPath();

    const sliceWidth = (canvas.width * 1.0) / bufferLength;
    let x = 0;

    for(let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if(i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }

  draw();
}

function submitRecording() {
  const blob = new Blob(chunks, { type: 'audio/webm; codecs=opus' });
  const formData = new FormData();
  formData.append('audio', blob, 'recording.webm');

  fetch('/upload', {
    method: 'POST',
    body: formData,
  })
  .then((response) => {
    if(response.ok) {
      alert('Recording successfully uploaded!');
      submitButton.disabled = true;
      recordButton.disabled = false;
      chunks = [];
    } else {
      alert('Upload failed.');
    }
  })
  .catch((error) => {
    console.error('Error:', error);
    alert('An error occurred.');
  });
}

(function() {
  const webcam = document.getElementById('webcam');
  const playPauseBtn = document.getElementById('play-pause');
  const volumeUpArea = document.getElementById('volume-up');
  const volumeDownArea = document.getElementById('volume-down');
  const emotionEnum = {
      happy: 0,
    };
  let currentMusic = null;
  let prevExpression = null;
  let stopDetectingExpression = false;

  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    // faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
    faceapi.nets.faceExpressionNet.loadFromUri('/models')
  ]).then(startVideo);

  function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: { 
        width: { max: 480 },
        height: { max: 360 }
      }})
      .then(stream => webcam.srcObject = stream)
      .catch(err => console.error(err))
  };
  
  webcam.addEventListener('play', () => {
    let emotionsDiv = null;
    let timeoutId = null;
    const canvas = faceapi.createCanvasFromMedia(webcam);
    canvas.classList.add('absolute', 'z-10');
    canvas.style.top = webcam.offsetTop + 'px';
    canvas.style.left = webcam.offsetLeft + 'px';
    document.getElementById('container').append(canvas);

    const canvasDisplaySize = { width: webcam.videoWidth, height: webcam.videoHeight };
    faceapi.matchDimensions(canvas, canvasDisplaySize);

    resizeVideoOverlay();
    initAudioWaveforms();

    setInterval(async () => {
      const detection = await faceapi.detectSingleFace(webcam, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
      console.log(detection);

      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      if(detection) {
        const resizedDetections = faceapi.resizeResults(detection, canvasDisplaySize);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        checkIfFaceEntersVolumeArea(detection);

        const expression = detectExpression(detection);
        // if(expression) console.log(expression);
        if(Number.isInteger(expression)) {
          switch(expression) {
            case emotionEnum.happy:
              // playPauseBtn.click();
              break;
            default:
          }
        }
      }
    }, 200)
  });

  window.addEventListener('resize', resizeVideoOverlay);

  function resizeVideoOverlay() {
    const videoOverlay = document.getElementById('video-overlay');

    videoOverlay.style.width = webcam.videoWidth + 'px';
    videoOverlay.style.height = webcam.videoHeight + 'px';
    videoOverlay.style.top = webcam.offsetTop + 'px';
    videoOverlay.style.left = webcam.offsetLeft + 'px';
  };

  function initAudioWaveforms() {
    checkCurrentMusicExists();

    const audioContext = new AudioContext(); 
    const analyser = audioContext.createAnalyser(); 
    const waveformCanvas = document.getElementById('waveform');
    const canvasContext = waveformCanvas.getContext('2d');
  
    analyser.fftSize = 256;
    const source = audioContext.createMediaElementSource(currentMusic); 
    source.connect(analyser);
    analyser.connect(audioContext.destination);
    frameLooper();
  
    function frameLooper(){
      const canvasWidth = waveformCanvas.offsetWidth;
      const canvasHeight = waveformCanvas.offsetHeight;
      let fbcArray = new Uint8Array(analyser.frequencyBinCount);

      analyser.getByteFrequencyData(fbcArray);
      canvasContext.clearRect(0, 0, canvasWidth, canvasHeight); // Clear the canvas
      // canvasContext.fillStyle = '#2b6bc0'; // Color of the bars
      window.requestAnimationFrame(frameLooper);
  
      const barsNum = analyser.fftSize / 2.0;
      const barSpace = canvasWidth / barsNum;
      const barWidth = 2;
  
      for (let i = 0; i < barsNum; i++) {
        const barX = i * barSpace;
        const amplitude = fbcArray[i];
        const barHeight = amplitude / 2;
        
        canvasContext.lineWidth = barWidth;
        canvasContext.strokeStyle = '#2b6bc0';
        canvasContext.beginPath();
        canvasContext.moveTo(barX, canvasHeight);
        canvasContext.lineTo(barX, canvasHeight - barHeight);
        canvasContext.stroke();
      }
    }
  }

  function checkIfFaceEntersVolumeArea(detection) {
    const faceWidth = Number(detection.alignedRect.box.width);
    const halfFace = Number(detection.alignedRect.box.left) + faceWidth/2;
    const volumeUpRight = Number(volumeUpArea.offsetLeft) + Number(volumeUpArea.offsetWidth);
    const volumeDownLeft = Number(volumeDownArea.offsetLeft);
    
    if(halfFace < volumeUpRight) volumeUpArea.click();
    if(halfFace > volumeDownLeft) volumeDownArea.click();
  }

  function detectExpression(detection) {
    if(stopDetectingExpression) return;

    const emotions = [];
    emotions[emotionEnum.happy] = detection.expressions['happy'] || 0;


    for(let [k, v] of Object.entries(detection.expressions)) {
      if(v > emotions[emotionEnum.happy] && emotionEnum[k] === undefined) {
        prevExpression = null;
        return;
      }
    }

    stopDetectingExpression = true;
    setTimeout(() => { stopDetectingExpression = false; }, 3000);

    return emotionEnum.happy;
  };

  function audioFactory(url) {
    const audio = new Audio(url);
    // audio.pause();
    audio.currentTime = 0;
    audio.autoplay = true;
    return audio;
  };

  function playBeepSound() {
    const beepSound = audioFactory('audio/beep.mp3');
    beepSound.play();
  }

  playPauseBtn.addEventListener('click', () => {
    checkCurrentMusicExists();
    playBeepSound();
    currentMusic.paused ? playMusic() : pauseMusic();
  });

  volumeUpArea.addEventListener('click', () => {
    checkCurrentMusicExists();
    playBeepSound();
    const tmp = currentMusic.volume + 0.1;
    if(tmp <= 1) currentMusic.volume = tmp;
  });

  volumeDownArea.addEventListener('click', () => {
    checkCurrentMusicExists();
    playBeepSound();
    const tmp = currentMusic.volume - 0.1;
    if(tmp >= 0) currentMusic.volume = tmp;
  });

  function checkCurrentMusicExists() {
    if(!currentMusic) {
      currentMusic = audioFactory('audio/rock.mp3');
    }
  };

  function playMusic() {
    currentMusic.play();
    playPauseBtn.innerHTML = '<i class="far fa-pause-circle"></i>';
  };

  function pauseMusic() {
    currentMusic.pause();
    playPauseBtn.innerHTML = '<i class="far fa-play-circle"></i>';
  };
}());
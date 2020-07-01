(function() {
  const webcam = document.getElementById('webcam');
  const playPauseBtn = document.getElementById('play-pause');
  const volumeUpArea = document.getElementById('volume-up');
  const volumeDownArea = document.getElementById('volume-down');
  const emotionEnum = {
      happy: 0,
    };
  let currentMusic = null;
  let stopDetectingExpression = false;
  let faceDetectionCanvas = null;

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
    faceDetectionCanvas = faceapi.createCanvasFromMedia(webcam);
    faceDetectionCanvas.classList.add('absolute', 'z-10');
    initAudioWaveforms();
    setAudioEvents();
    resizeCanvas();
    document.getElementById('container').append(faceDetectionCanvas);

    const canvasDisplaySize = { width: webcam.videoWidth, height: webcam.videoHeight };
    // faceapi.matchDimensions(faceDetectionCanvas, canvasDisplaySize);
    resizeVideoOverlay();


    setInterval(async () => {
      const detection = await faceapi.detectSingleFace(webcam, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
      // console.log(detection);

      faceDetectionCanvas.getContext('2d').clearRect(0, 0, faceDetectionCanvas.width, faceDetectionCanvas.height);
      if(detection) {
        const resizedDetections = faceapi.resizeResults(detection, canvasDisplaySize);
        faceapi.draw.drawDetections(faceDetectionCanvas, resizedDetections);
        // faceapi.draw.drawFaceLandmarks(faceDetectionCanvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(faceDetectionCanvas, resizedDetections);

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
    }, 250)
  });

  window.addEventListener('resize', resizeVideoOverlay);
  window.addEventListener('resize', resizeCanvas);

  function resizeVideoOverlay() {
    const videoOverlay = document.getElementById('video-overlay');

    videoOverlay.style.width = webcam.videoWidth + 'px';
    videoOverlay.style.height = webcam.videoHeight + 'px';
    videoOverlay.style.top = webcam.offsetTop + 'px';
    videoOverlay.style.left = webcam.offsetLeft + 'px';
  };

  function resizeCanvas() {
    if(!faceDetectionCanvas) return;

    faceDetectionCanvas.style.top = webcam.offsetTop + 'px';
    faceDetectionCanvas.style.left = webcam.offsetLeft + 'px';
    faceDetectionCanvas.style.top = webcam.offsetTop + 'px';
    faceDetectionCanvas.style.left = webcam.offsetLeft + 'px';
  }

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
      window.requestAnimationFrame(frameLooper);

      const canvasWidth = waveformCanvas.offsetWidth;
      const canvasHeight = waveformCanvas.offsetHeight;
      let fbcArray = new Uint8Array(analyser.frequencyBinCount);

      waveformCanvas.width = canvasWidth;

      analyser.getByteFrequencyData(fbcArray);
      canvasContext.clearRect(0, 0, canvasWidth, canvasHeight); // Clear the canvas
      
      const barsNum = analyser.fftSize/2.0 * 2/3;
      const barSpace = canvasWidth / barsNum;
      const barWidth = 2;
      const barMiddle = canvasHeight / 2 + 1;
  
      for (let i = 0; i < barsNum; i++) {
        const barX = i * barSpace;
        const amplitude = fbcArray[i] / 4.0;
        const halfBarHeight = amplitude / 2;
        
        canvasContext.lineWidth = barWidth;
        canvasContext.strokeStyle = '#90cdf4';
        canvasContext.beginPath();
        canvasContext.moveTo(barX, barMiddle + halfBarHeight);
        if(halfBarHeight >= 1)
          canvasContext.lineTo(barX, barMiddle - halfBarHeight);
        else
          canvasContext.lineTo(barX, barMiddle - 1);
        canvasContext.stroke();
      }
    }
  }

  function setAudioEvents() {
    currentMusic.addEventListener('ended', () => {
      playPauseBtn.innerHTML = '<i class="far fa-play-circle"></i>';
      document.getElementById('audio-current-time').innerHTML = '0:00';
    });

    currentMusic.ontimeupdate = function() {
      const audioCurrentTime = document.getElementById('audio-current-time');
      const time = currentMusic.currentTime;
      const m = Math.floor(time/60);
      let s = Math.floor(time % 60);
      s = s < 10 ? `0${s}` : s;
      audioCurrentTime.innerHTML = `${m}:${s}`;
    };

    currentMusic.addEventListener('loadeddata', () => {
      const audioDuration = document.getElementById('audio-duration');
      const time = currentMusic.duration;
      if(isNaN(time)) {
        audioDuration.innerHTML = '';
        return;
      }
      const m = Math.floor(time/60);
      let s = Math.floor(time % 60);
      s = s < 10 ? `0${s}` : s;
      audioDuration.innerHTML = `${m}:${s}`;
    });
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
    audio.currentTime = 0;
    audio.autoplay = false;
    return audio;
  };

  function playBeepSound() {
    const beepSound = audioFactory('audio/beep.mp3');
    beepSound.volume = 0.2;
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
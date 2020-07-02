(function() {
  const webcam = document.getElementById('webcam');
  const playPauseBtn = document.getElementById('play-pause');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');
  const volumeUpArea = document.getElementById('volume-up');
  const volumeDownArea = document.getElementById('volume-down');
  const emotionEnum = {
      disgusted: 0,
    };
  let currentMusic = null;
  let stopDetectingExpression = false;
  let faceCanvas = null;


  /**  Init face datection api and call webcam
   */
  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
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
    /** create canvas to show face detected and prepare audio waveform, 
     *  also resize volume controls which is an overlay on video
    */
    faceCanvas = faceapi.createCanvasFromMedia(webcam);
    faceCanvas.classList.add('absolute', 'z-10');
    initAudioWaveforms();
    setAudioEvents();
    resizeCanvas();
    document.getElementById('container').append(faceCanvas);
    resizeVideoOverlay();

    /** use setInterval repeatedly detect face and expressions in current video,
     *  also draw face position on canvas
     */
    setInterval(async () => {
      // detecting face and expressions
      const detection = await faceapi.detectSingleFace(webcam, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
      // clear canvas
      faceCanvas.getContext('2d').clearRect(0, 0, faceCanvas.width, faceCanvas.height);

      if(detection) {
        // draw detection results
        // const resizedDetections = faceapi.resizeResults(detection, { width: webcam.videoWidth, height: webcam.videoHeight });
        faceapi.draw.drawDetections(faceCanvas, detection);
        faceapi.draw.drawFaceExpressions(faceCanvas, detection);

        // determine that is face entering volume controls areas
        checkIfFaceEntersVolumeArea(detection);
        // check if expression is what we expect
        const expression = detectExpression(detection);

        // different expressionshave different commands (only disgusted noe)
        if(Number.isInteger(expression)) {
          switch(expression) {
            case emotionEnum.disgusted:
              playPauseBtn.click();
              break;
            default:
          }
        }
      }
    }, 250);

    document.getElementById('spinner-container').remove();
  });

  window.addEventListener('resize', () => {
    setTimeout(() => {
      resizeCanvas();
      resizeVideoOverlay();
    }, 0);
  });

  function resizeVideoOverlay() {
    const videoOverlay = document.getElementById('video-overlay');

    videoOverlay.style.width = webcam.videoWidth + 'px';
    videoOverlay.style.height = webcam.videoHeight + 'px';
    videoOverlay.style.top = webcam.offsetTop + 'px';
    videoOverlay.style.left = webcam.offsetLeft + 'px';
  };

  function resizeCanvas() {
    if(!faceCanvas) return;

    faceCanvas.style.top = webcam.offsetTop + 'px';
    faceCanvas.style.left = webcam.offsetLeft + 'px';
    faceCanvas.style.top = webcam.offsetTop + 'px';
    faceCanvas.style.left = webcam.offsetLeft + 'px';
  }

  function initAudioWaveforms() {
    checkCurrentMusicExists();

    const audioContext = new AudioContext(); 
    const analyser = audioContext.createAnalyser(); 
    const waveformCanvas = document.getElementById('waveform');
    const canvasContext = waveformCanvas.getContext('2d');
  
    analyser.fftSize = 128;
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
      const barWidth = 5;
      const barMiddle = canvasHeight / 2 + 1;
  
      for (let i = 0; i < barsNum; i++) {
        const barX = i * barSpace;
        const amplitude = fbcArray[i] / 4.0;
        const halfBarHeight = amplitude / 2;
        
        canvasContext.lineWidth = barWidth;
        canvasContext.strokeStyle = '#CA715F';
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
    emotions[emotionEnum.disgusted] = detection.expressions['disgusted'] || 0;


    for(let [k, v] of Object.entries(detection.expressions)) {
      if(v > emotions[emotionEnum.disgusted] && emotionEnum[k] === undefined) {
        prevExpression = null;
        return;
      }
    }

    stopDetectingExpression = true;
    setTimeout(() => { stopDetectingExpression = false; }, 3000);

    return emotionEnum.disgusted;
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
    playPauseBtn.classList.remove('pulse');
    void playPauseBtn.offsetWidth;
    playPauseBtn.classList.add('pulse');
    currentMusic.paused ? playMusic() : pauseMusic();
  });

  volumeUpArea.addEventListener('click', () => {
    checkCurrentMusicExists();
    playBeepSound();
    volumeUpArea.classList.remove('pulse-pink');
    void volumeUpArea.clientWidth;
    volumeUpArea.classList.add('pulse-pink');
    const tmp = currentMusic.volume + 0.1;
    if(tmp <= 1) currentMusic.volume = tmp;
  });

  volumeDownArea.addEventListener('click', () => {
    checkCurrentMusicExists();
    playBeepSound();
    volumeDownArea.classList.remove('pulse-pink');
    void volumeDownArea.clientWidth;
    volumeDownArea.classList.add('pulse-pink');
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
    playIcon.classList.add('hidden');
    pauseIcon.classList.remove('hidden');
  };

  function pauseMusic() {
    currentMusic.pause();
    playIcon.classList.remove('hidden');
    pauseIcon.classList.add('hidden');
  };
}());
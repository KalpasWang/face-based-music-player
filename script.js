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

    currentMusic = audioFactory('audio/rock.mp3');

    setInterval(async () => {
      const detection = await faceapi.detectSingleFace(webcam, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
      console.log(detection);

      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      if(detection) {
        const resizedDetections = faceapi.resizeResults(detection, canvasDisplaySize);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        // faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        checkIfEnterVolumeArea(detection);

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

  function checkIfEnterVolumeArea(detection) {
    const faceWidth = Number(detection.alignedRect.box.width);
    const faceLeft = Number(detection.alignedRect.box.left) + faceWidth/3;
    const faceRight = Number(detection.alignedRect.box.Right) - faceWidth/3;
    const volumeUpRight = Number(volumeUpArea.offsetLeft) + Number(volumeUpArea.offsetWidth);
    const volumeDownLeft = Number(volumeDownArea.offsetLeft);
    
    if(volumeUpRight > faceLeft) volumeUpArea.click();
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
    audio.pause();
    audio.currentTime = 0;
    return audio;
  };

  function playBeepSound() {
    const beepSound = audioFactory('audio/beep.mp3');
    beepSound.play();
  }

  playPauseBtn.addEventListener('click', () => {
    if(!currentMusic) {
      currentMusic = audioFactory('audio/rock.mp3');
    }

    playBeepSound();
    currentMusic.paused ? playMusic() : pauseMusic();
  });

  volumeUpArea.addEventListener('click', () => {
    if(!currentMusic) {
      currentMusic = audioFactory('audio/rock.mp3');
    }

    playBeepSound();
    const tmp = currentMusic + 0.1;
    if(tmp <= 1) currentMusic = tmp;
  });

  function playMusic() {
    currentMusic.play();
    playPauseBtn.innerHTML = '<i class="far fa-pause-circle"></i>';
  };

  function pauseMusic() {
    currentMusic.pause();
    playPauseBtn.innerHTML = '<i class="far fa-play-circle"></i>';
  };
}());
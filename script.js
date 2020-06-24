(function() {
  const webcam = document.getElementById('webcam');
  const playPauseBtn = document.getElementById('play-pause');
  const emotionEnum = {
      surprised: 0,
    };
  let currentMusic = null;
  let prevExpression = null;

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
    const canvasDisplaySize = { width: webcam.clientWidth, height: webcam.clientHeight };

    canvas.classList.add('absolute', 'z-10');
    document.body.append(canvas);
    faceapi.matchDimensions(canvas, canvasDisplaySize);

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

        const expression = detectExpression(detection);
        // if(expression) console.log(expression);

        if(Number.isInteger(expression)) {
          // if(!emotionsDiv) {
          //   const tmp = document.getElementById('emotions');
          //   if(!tmp) return;
          //   emotionsDiv = tmp;
          // }

          // emotionsDiv.children[expression].classList.add('bg-blue-500', 'bg-opacity-75');
          // const clickAudio = new Audio('audio/click.mp3');
          // clickAudio.play();

          // if(timeoutId) clearTimeout(timeoutId);
          // timeoutId = setTimeout(() => {
          //   emotionsDiv.children[expression].classList.remove('bg-blue-500', 'bg-opacity-75');
          // }, 200);

          switch(expression) {
            case emotionEnum.surprised:
              playOrPauseAudio();
              break;
            default:
          }
        }
      }
    }, 300)
  });

  function detectExpression(detection) {
    const emotions = [];
    emotions[emotionEnum.surprised] = detection.expressions['surprised'] || 0;


    for(let [k, v] of Object.entries(detection.expressions)) {
      if(v > emotions[emotionEnum.surprised] && emotionEnum[k] === undefined) {
        prevExpression = null;
        return;
      }
    }
    
    if(emotionEnum.surprised === prevExpression) {
      prevExpression = null;
      return emotionEnum.surprised;
    } 

    prevExpression = null;
  };

  function playOrPauseAudio() {
    if(!currentMusic) return;

    currentMusic.paused ? currentMusic.play() : currentMusic.pause();
  };

  function audioFactory(url) {
    const audio = new Audio(url);
    audio.pause();
    audio.currentTime = 0;
    return audio;
  }
}());

// const webcam = document.getElementById('webcam');
// const player = document.getElementById('player');
// const playBtn = document.getElementById('play');
// const emotionEnum = {
//     surprised: 0,
//     happy: 1,
//     disgusted: 2,
//     angry: 3
//   };
// let prevDetection = null;
// let audio = null;

// Promise.all([
//   faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
//   faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
//   // faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
//   faceapi.nets.faceExpressionNet.loadFromUri('/models')
// ]).then(startVideo);

// function startVideo() {
//   navigator.mediaDevices.getUserMedia({ video: {} })
//     .then(stream => webcam.srcObject = stream)
//     .catch(err => console.error(err))
// }

// webcam.addEventListener('play', () => {
//   const canvas = faceapi.createCanvasFromMedia(webcam);
//   document.body.append(canvas);
//   const displaySize = { width: webcam.clientWidth, height: webcam.clientHeight };
//   faceapi.matchDimensions(canvas, displaySize);
//   let emotionsDiv = null;
//   let timeoutId = null;

//   setInterval(async () => {
//     const detection = await faceapi.detectSingleFace(webcam, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceExpressions();
//     // console.log(detection);

//     canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
//     if (detection) {
//       const resizedDetections = faceapi.resizeResults(detection, displaySize);
//       faceapi.draw.drawDetections(canvas, resizedDetections);
//       faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
//       faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

//       const expression = detectExpression(detection);
//       if(expression) console.log(expression);

//       if(Number.isInteger(expression)) {
//         if(!emotionsDiv) {
//           const tmp = document.getElementById('emotions');
//           if(!tmp) return;
//           emotionsDiv = tmp;
//         }

//         emotionsDiv.children[expression].classList.add('bg-blue-500', 'bg-opacity-75');
//         const clickAudio = new Audio('audio/click.mp3');
//         clickAudio.play();

//         if(timeoutId) clearTimeout(timeoutId);
//         timeoutId = setTimeout(() => {
//           emotionsDiv.children[expression].classList.remove('bg-blue-500', 'bg-opacity-75');
//         }, 200);

//         switch(expression) {
//           case emotionEnum.surprised:
//             setAudioVolume(-0.1);
//             break;
//           case emotionEnum.happy:
//             setAudioVolume(0.1);
//             break;
//           case emotionEnum.disgusted:
//             pauseOrPlayAudio();
//             break;
//           case emotionEnum.angry:
//             stopAndQuitAudio();
//             break;
            
//         }
//       }
//     }
//   }, 200)
// });

// function detectExpression(detection) {
//   const emotions = [];

//   emotions[emotionEnum.surprised] = detection.expressions['surprised'] || 0;
//   emotions[emotionEnum.happy] = detection.expressions['happy'] || 0;
//   emotions[emotionEnum.disgusted] = detection.expressions['disgusted'] || 0;
//   emotions[emotionEnum.angry] = detection.expressions['angry'] || 0;

//   const maxNumIdx = emotions.reduce((maxNumIdx, num, idx, arr) => {
//       if(num > 0 && num > arr[maxNumIdx]) {
//         return idx;
//       }
//       return maxNumIdx;
//     }, 0);

//   if(emotions[maxNumIdx] == 0) {
//     prevDetection = null;
//     return;
//   }

//   for(let [k, v] of Object.entries(detection.expressions)) {
//     if(v > emotions[maxNumIdx] && emotionEnum[k] === undefined) {
//       prevDetection = null;
//       return;
//     }
//   }
  
//   if(maxNumIdx === prevDetection) {
//     return maxNumIdx
//   } else {
//     prevDetection = maxNumIdx;
//   }
// }


// function setAudioVolume(amount) {
//   if(!audio) return;
  
//   let tmpVolume = audio.volume + amount;
//   tmpVolume = tmpVolume > 1 ? 1 : tmpVolume;
//   tmpVolume = tmpVolume < 0 ? 0 : tmpVolume;
//   audio.volume = tmpVolume;
//   return true;
// }


// function pauseOrPlayAudio() {
//   if(!audio) return;

//   audio.paused ? audio.play() : audio.pause();
// }


// function stopAndQuitAudio() {
//   if(!audio) return;

//   audio.pause();
//   audio.currentTime = 0;
//   window.location.reload(true);
// }


// playBtn.addEventListener('click', () => {
//   // play click sound effect when entering play music mode
//   const clickAudio = new Audio('audio/click.mp3');
//   clickAudio.play();

//   // replace the original view in player
//   const template = `
//   <div class="flex justify-center items-end w-full h-full">
//     <canvas id="waveform" class="h-32 mx-auto"></canvas>
//     <div id="emotions" class="flex justify-center items-stretch w-full h-32 text-3xl">
//       <div class="mx-3 border-solid border-2 border-gray-300 rounded-md">
//         <i class="fas fa-volume-down"></i> 😲
//       </div>
//       <div class="mx-3 border-solid border-2 border-gray-300 rounded-md">
//         <i class="fas fa-volume-up"></i> 😄
//       </div>
//       <div class="mx-3 border-solid border-2 border-gray-300 rounded-md">
//         <i class="far fa-pause-circle"></i> 🤢
//       </div>
//       <div class="mx-3 border-solid border-2 border-gray-300 rounded-md">
//         <i class="far fa-times-circle"></i> 😡
//       </div>
//     </div>
//   </div>`; 
//   player.innerHTML = template;


//   audio = new Audio('audio/rock.mp3');
//   // audio.controls = true;
//   // audio.loop = true;
//   audio.autoplay = true;

//   const audioContext = new AudioContext(); // AudioContext object instance
//   const analyser = audioContext.createAnalyser(); // AnalyserNode method
//   const waveCanvas = document.getElementById('waveform');
//   const canvasContext = waveCanvas.getContext('2d');
//   waveCanvas.width = webcam.clientWidth;
//   // canvas.height = webcam.clientHeight;

//   // Re-route audio playback into the processing graph of the AudioContext
//   const source = audioContext.createMediaElementSource(audio); 
//   source.connect(analyser);
//   analyser.connect(audioContext.destination);
//   frameLooper();

//   function frameLooper(){
//     window.requestAnimationFrame(frameLooper);
//     let fbc_array = new Uint8Array(analyser.frequencyBinCount);
//     analyser.getByteFrequencyData(fbc_array);
//     canvasContext.clearRect(0, 0, waveCanvas.width, waveCanvas.height); // Clear the canvas
//     canvasContext.fillStyle = 'rgba(0, 205, 255, 0.75)';//'#00CCFF'; // Color of the bars
//     // console.log(fbc_array);

//     const bars = 100;
//     const bar_width = waveCanvas.width / bars;
//     for (let i = 0; i < bars; i++) {
//       let bar_x = i * bar_width;
//       let amplitude = fbc_array[i];
//       let bar_height = -(amplitude / 2);
//       //  fillRect( x, y, width, height ) // Explanation of the parameters below
//       canvasContext.fillRect(bar_x, waveCanvas.height, bar_width, bar_height);
//     }
//   }
// });
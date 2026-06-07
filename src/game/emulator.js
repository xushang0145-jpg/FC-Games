/**
 * jsnes 模拟器封装
 */
import jsnes from 'jsnes';

const SAMPLE_RATE = 44100;
const BUFFER_SIZE = 4096;

/** ArrayBuffer → 二进制字符串（分块避免栈溢出） */
function arrayBufferToBinaryString(buf) {
  const bytes = new Uint8Array(buf);
  const chunks = [];
  const CHUNK = 4096;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    chunks.push(String.fromCharCode(...bytes.subarray(i, i + CHUNK)));
  }
  return chunks.join('');
}

/** frameBuffer (每像素一个 24 位颜色值 0xBBGGRR) → 复用的 ImageData (RGBA) */
function updateImageDataFromFrame(frameBuffer, img) {
  const d = img.data;
  for (let i = 0; i < frameBuffer.length; i++) {
    const color = frameBuffer[i];
    d[i * 4] = color & 0xFF;
    d[i * 4 + 1] = (color >> 8) & 0xFF;
    d[i * 4 + 2] = (color >> 16) & 0xFF;
    d[i * 4 + 3] = 255;
  }
}

export function createEmulator() {
  let nes = null;
  let canvas = null;
  let canvasCtx = null;
  let audioCtx = null;
  let frameId = null;
  let audioBuffer = [];
  let audioNode = null;
  let status = 'idle';
  let img = null;

  function init(canvasEl) {
    canvas = canvasEl;
    canvasCtx = canvas.getContext('2d');

    function resizeCanvas() {
      const maxW = window.innerWidth;
      const maxH = window.innerHeight - 60;
      const scale = Math.min(maxW / 256, maxH / 240);
      canvas.style.width = `${Math.floor(256 * scale)}px`;
      canvas.style.height = `${Math.floor(240 * scale)}px`;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    img = canvasCtx.createImageData(256, 240);

    nes = new jsnes.NES({
      onFrame(frameBuffer) {
        updateImageDataFromFrame(frameBuffer, img);
        canvasCtx.putImageData(img, 0, 0);
      },
      onAudioSample(left, right) {
        audioBuffer.push(left, right);
      },
    });

    status = 'idle';
  }

  function setupAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    audioNode = audioCtx.createScriptProcessor(BUFFER_SIZE, 0, 2);
    audioNode.onaudioprocess = () => {
      if (audioBuffer.length < BUFFER_SIZE * 2) return;
      const outLeft = audioNode.outputBuffer.getChannelData(0);
      const outRight = audioNode.outputBuffer.getChannelData(1);
      const samples = audioBuffer.splice(0, BUFFER_SIZE * 2);
      for (let i = 0; i < BUFFER_SIZE; i++) {
        outLeft[i] = samples[i * 2] || 0;
        outRight[i] = samples[i * 2 + 1] || 0;
      }
    };
    audioNode.connect(audioCtx.destination);
  }

  function loadROM(arrayBuffer) {
    nes.loadROM(arrayBufferToBinaryString(arrayBuffer));
    status = 'loaded';
  }

  function start() {
    status = 'running';
    runFrame();
  }

  function runFrame() {
    if (status !== 'running') return;
    try {
      nes.frame();
    } catch (e) {
      console.error('模拟器帧循环错误:', e);
      stop();
      return;
    }
    frameId = requestAnimationFrame(runFrame);
  }

  function stop() {
    status = 'stopped';
    if (frameId) { cancelAnimationFrame(frameId); frameId = null; }
    if (audioNode) { audioNode.disconnect(); audioNode = null; }
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    audioBuffer = [];
  }

  // buttonDown/Up 仅在 status==='loaded' 或 'running' 时有效
  function buttonDown(controller, button) {
    if (nes && (status === 'running' || status === 'loaded')) {
      nes.buttonDown(controller, button);
    }
  }

  function buttonUp(controller, button) {
    if (nes && (status === 'running' || status === 'loaded')) {
      nes.buttonUp(controller, button);
    }
  }

  function getStatus() { return status; }

  return { init, loadROM, start, stop, buttonDown, buttonUp, getStatus, setupAudio };
}

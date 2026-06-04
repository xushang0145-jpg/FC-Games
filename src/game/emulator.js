/**
 * jsnes 模拟器封装
 * 负责：初始化 jsnes、帧循环渲染、音频输出、按键输入转发、ROM 加载、资源释放
 */
import jsnes from 'jsnes';

const SAMPLE_RATE = 44100;
const BUFFER_SIZE = 4096;

export function createEmulator() {
  let nes = null;
  let canvas = null;
  let canvasCtx = null;
  let audioCtx = null;
  let frameId = null;
  let audioBuffer = [];
  let audioNode = null;
  let status = 'idle';

  function init(canvasEl) {
    canvas = canvasEl;
    canvasCtx = canvas.getContext('2d');

    nes = new jsnes.NES({
      onFrame(frameBuffer) {
        const imageData = canvasCtx.createImageData(256, 240);
        for (let i = 0; i < frameBuffer.length; i++) {
          imageData.data[i] = frameBuffer[i];
        }
        canvasCtx.putImageData(imageData, 0, 0);
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
        outLeft[i] = samples[i * 2];
        outRight[i] = samples[i * 2 + 1];
      }
    };
    audioNode.connect(audioCtx.destination);
  }

  function loadROM(arrayBuffer) {
    const romData = String.fromCharCode(...new Uint8Array(arrayBuffer));
    nes.loadROM(romData);
    status = 'loaded';
  }

  function start() {
    if (!audioCtx) setupAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();
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
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    if (audioNode) {
      audioNode.disconnect();
      audioNode = null;
    }
    if (audioCtx && audioCtx.state !== 'closed') {
      audioCtx.close().catch(() => {});
      audioCtx = null;
    }
    audioBuffer = [];
  }

  function buttonDown(controller, button) {
    if (nes && status === 'running') {
      nes.buttonDown(controller, button);
    }
  }

  function buttonUp(controller, button) {
    if (nes && status === 'running') {
      nes.buttonUp(controller, button);
    }
  }

  function getStatus() {
    return status;
  }

  return { init, loadROM, start, stop, buttonDown, buttonUp, getStatus, setupAudio };
}

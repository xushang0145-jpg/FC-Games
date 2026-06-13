/**
 * jsnes 模拟器封装
 */
import jsnes from 'jsnes';

const SAMPLE_RATE = 44100;
const BUFFER_SIZE = 4096;
const RING_SIZE = 16384;              // 环形缓冲区大小（2 的幂）
const RING_MASK = RING_SIZE - 1;
const AUDIO_TARGET = 1024;            // 音频回调中保持的目标缓冲样本数

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
  let audioNode = null;
  let status = 'idle';
  let img = null;

  // 环形缓冲区（参照 jsnes 官方示例 nes-embed.js）
  let ringL = new Float32Array(RING_SIZE);
  let ringR = new Float32Array(RING_SIZE);
  let writePos = 0;
  let readPos = 0;

  function ringRemain() {
    return (writePos - readPos) & RING_MASK;
  }

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
        ringL[writePos] = left;
        ringR[writePos] = right;
        writePos = (writePos + 1) & RING_MASK;
      },
    });

    status = 'idle';
  }

  function setupAudio() {
    // 在用户交互上下文中创建 AudioContext（同步执行，确保 running 状态）
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: SAMPLE_RATE });
    }
    if (!audioNode) {
      audioNode = audioCtx.createScriptProcessor(BUFFER_SIZE, 0, 2);
      audioNode.onaudioprocess = (event) => {
        // 缓冲区低水位时从音频线程驱动帧生成，防止欠载（参照 jsnes 官方示例）
        if (ringRemain() < AUDIO_TARGET && status === 'running') {
          try {
            nes.frame();
          } catch (e) {
            // 帧生成失败时忽略，避免音频回调中抛出异常
          }
        }
        const outLeft = event.outputBuffer.getChannelData(0);
        const outRight = event.outputBuffer.getChannelData(1);
        for (let i = 0; i < BUFFER_SIZE; i++) {
          if (ringRemain() > 0) {
            outLeft[i] = ringL[readPos];
            outRight[i] = ringR[readPos];
            readPos = (readPos + 1) & RING_MASK;
          } else {
            outLeft[i] = 0;
            outRight[i] = 0;
          }
        }
      };
      audioNode.connect(audioCtx.destination);
    }
    // 若 AudioContext 仍为 suspended，尝试恢复（兼容某些非标准手势场景）
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
        console.log('AudioContext 已恢复运行');
      }).catch((err) => {
        console.warn('AudioContext.resume() 失败:', err.message);
      });
    }
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
    // 不关闭 AudioContext，保持实例复用
    // 环形缓冲区不需要清理（旧数据自然被新数据覆盖）
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

  function serializeState() {
    if (!nes) return null;
    return nes.toJSON();
  }

  function deserializeState(state) {
    if (!nes || !state) return false;
    try {
      nes.fromJSON(state);
      status = 'loaded';
      return true;
    } catch (e) {
      console.error('反序列化存档失败:', e);
      return false;
    }
  }

  return { init, loadROM, start, stop, buttonDown, buttonUp, getStatus, setupAudio, serializeState, deserializeState };
}

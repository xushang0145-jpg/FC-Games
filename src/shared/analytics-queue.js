/**
 * localStorage 暂存队列模块
 * 网络失败时将事件暂存到 localStorage，上限 100 条，FIFO 淘汰
 */

const QUEUE_KEY = 'fc_analytics_queue';
const MAX_QUEUE_SIZE = 100;

/**
 * 读取暂存队列
 * @returns {Array<Object>}
 */
function readQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * 写入暂存队列
 * @param {Array<Object>} queue
 */
function writeQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage 满或不可用，静默丢弃
  }
}

/**
 * 将事件加入暂存队列
 * @param {Object} event
 */
export function enqueue(event) {
  const queue = readQueue();
  queue.push(event);
  // FIFO 淘汰：超出上限时删除最旧的数据
  if (queue.length > MAX_QUEUE_SIZE) {
    queue.splice(0, queue.length - MAX_QUEUE_SIZE);
  }
  writeQueue(queue);
}

/**
 * 读取所有暂存事件并清空队列
 * @returns {Array<Object>}
 */
export function dequeueAll() {
  const queue = readQueue();
  if (queue.length > 0) {
    try {
      localStorage.removeItem(QUEUE_KEY);
    } catch {
      // 忽略
    }
  }
  return queue;
}

/**
 * 获取当前队列长度
 * @returns {number}
 */
export function queueLength() {
  return readQueue().length;
}

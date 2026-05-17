import http from 'http';
import { randomUUID, createHash } from 'crypto';
import { URL } from 'url';

type QueueMessage = {
  messageId: string;
  receiptHandle: string;
  body: string;
  visibleAt: number;
};

const PORT = Number(process.env.LOCAL_SQS_PORT ?? 9324);
const QUEUE_NAME = 'submissions';
const queues = new Map<string, QueueMessage[]>();

function queueKey(queueUrl?: string, pathname?: string) {
  if (queueUrl) {
    try {
      return new URL(queueUrl).pathname.replace(/^\/+/, '') || QUEUE_NAME;
    } catch {
      return QUEUE_NAME;
    }
  }

  return pathname?.replace(/^\/+/, '') || QUEUE_NAME;
}

function bodyHash(body: string) {
  return createHash('md5').update(body).digest('hex');
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function parseFormBody(body: string) {
  const params = new URLSearchParams(body);
  return Object.fromEntries(params.entries());
}

function xmlResponse(payload: string, res: any, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function errorResponse(message: string, res: any, code = 'InternalFailure') {
  xmlResponse(JSON.stringify({
    __type: code,
    message
  }), res, 500);
}

function ensureQueue(key: string) {
  const existing = queues.get(key);
  if (existing) return existing;
  const created: QueueMessage[] = [];
  queues.set(key, created);
  return created;
}

function handleSendMessage(params: Record<string, string>, key: string, res: any) {
  const queue = ensureQueue(key);
  const body = params.MessageBody ?? '';
  const messageId = randomUUID();
  const receiptHandle = randomUUID();

  queue.push({
    messageId,
    receiptHandle,
    body,
    visibleAt: Date.now()
  });

  xmlResponse(JSON.stringify({
    MD5OfMessageBody: bodyHash(body),
    MessageId: messageId
  }), res);
}

function handleReceiveMessage(params: Record<string, string>, key: string, res: any) {
  const queue = ensureQueue(key);
  const max = Math.max(1, Math.min(10, Number(params.MaxNumberOfMessages ?? '1')));
  const now = Date.now();
  const visible = queue.filter((message) => message.visibleAt <= now).slice(0, max);

  for (const message of visible) {
    message.visibleAt = now + 30_000;
    message.receiptHandle = randomUUID();
  }

  xmlResponse(JSON.stringify({
    Messages: visible.map((message) => ({
      MessageId: message.messageId,
      ReceiptHandle: message.receiptHandle,
      MD5OfBody: bodyHash(message.body),
      Body: message.body
    }))
  }), res);
}

function handleDeleteMessage(params: Record<string, string>, key: string, res: any) {
  const queue = ensureQueue(key);
  const receiptHandle = params.ReceiptHandle;
  const index = queue.findIndex((message) => message.receiptHandle === receiptHandle);
  if (index >= 0) {
    queue.splice(index, 1);
  }

  xmlResponse(JSON.stringify({}), res);
}

function handleGetQueueAttributes(_params: Record<string, string>, key: string, res: any) {
  const queueName = key.split('/').filter(Boolean).pop() || QUEUE_NAME;
  const queueArn = `arn:aws:sqs:local:000000000000:${queueName}`;

  xmlResponse(JSON.stringify({
    Attributes: {
      QueueArn: queueArn
    }
  }), res);
}

const server = http.createServer((req, res) => {
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);

  // eslint-disable-next-line no-console
  console.log(`[local-sqs] ${method} ${url.pathname}${url.search}`);
  // eslint-disable-next-line no-console
  console.log('[local-sqs] headers=', JSON.stringify(req.headers));

  if (method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('local sqs mock ok');
    return;
  }

  if (method !== 'POST') {
    errorResponse(`Unsupported method ${method}`, res, 'InvalidRequest');
    return;
  }

  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk.toString('utf8');
  });

  req.on('end', () => {
    let params: Record<string, string> = {};
    try {
      const parsed = JSON.parse(raw || '{}') as Record<string, unknown>;
      params = Object.fromEntries(
        Object.entries(parsed).map(([key, value]) => [key, typeof value === 'string' ? value : JSON.stringify(value)])
      );
    } catch {
      params = parseFormBody(raw);
    }

    const rawTarget = req.headers['x-amz-target'];
    const target = typeof rawTarget === 'string' ? rawTarget : Array.isArray(rawTarget) ? rawTarget[0] ?? '' : '';
    const actionFromTarget = target.includes('.') ? target.split('.')[1] : '';
    const action = params.Action ?? actionFromTarget ?? url.searchParams.get('Action') ?? '';
    const key = queueKey(params.QueueUrl ?? url.searchParams.get('QueueUrl') ?? undefined, url.pathname);

    // eslint-disable-next-line no-console
    console.log('[local-sqs] action=', action, 'queue=', key, 'body=', raw.slice(0, 500));

    try {
      switch (action) {
        case 'SendMessage':
          handleSendMessage(params, key, res);
          break;
        case 'ReceiveMessage':
          handleReceiveMessage(params, key, res);
          break;
        case 'DeleteMessage':
          handleDeleteMessage(params, key, res);
          break;
        case 'GetQueueAttributes':
          handleGetQueueAttributes(params, key, res);
          break;
        default:
          errorResponse(`Unsupported action ${action || '(missing)'}`, res, 'InvalidAction');
          break;
      }
    } catch (err) {
      errorResponse(err instanceof Error ? err.message : String(err), res);
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`local SQS mock listening on http://127.0.0.1:${PORT}`);
});
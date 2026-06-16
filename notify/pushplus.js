const DEFAULT_SEND_URL = 'https://www.pushplus.plus/send';

function getToken(options = {}) {
  return String(options.token || process.env.PUSHPLUS_TOKEN || '').trim();
}

function isEnabled(options = {}) {
  if (options.enabled === false) return false;
  return Boolean(getToken(options)) && process.env.PUSHPLUS_ENABLED !== 'false';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}

async function sendPushPlus({ title, content, template = 'html', channel, token } = {}) {
  const actualToken = getToken({ token });
  if (!actualToken || process.env.PUSHPLUS_ENABLED === 'false') return { skipped: true, reason: 'PushPlus token is empty or disabled' };

  const body = {
    token: actualToken,
    title: title || '农场提醒',
    content: content || '',
    template,
    channel: channel || process.env.PUSHPLUS_CHANNEL || 'wechat',
  };

  const res = await fetch(process.env.PUSHPLUS_SEND_URL || DEFAULT_SEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { code: res.status, msg: text }; }

  if (!res.ok || Number(data.code) !== 200) {
    throw new Error(`PushPlus 推送失败: ${data.msg || text || res.status}`);
  }
  return data;
}

function renderFarmMessage({ heading, friendName, friendGid, plantName, landId, matureAt, note } = {}) {
  const matureText = matureAt ? new Date(Number(matureAt)).toLocaleString() : '-';
  return [
    `<h3>${escapeHtml(heading || '农场提醒')}</h3>`,
    `<p><b>好友：</b>${escapeHtml(friendName || '-')}</p>`,
    `<p><b>GID：</b>${escapeHtml(friendGid || '-')}</p>`,
    `<p><b>作物：</b>${escapeHtml(plantName || '-')}</p>`,
    `<p><b>土地：</b>${escapeHtml(landId ? `#${landId}` : '-')}</p>`,
    `<p><b>成熟时间：</b>${escapeHtml(matureText)}</p>`,
    note ? `<p><b>说明：</b>${escapeHtml(note)}</p>` : '',
  ].filter(Boolean).join('');
}

async function sendFarmReminder(payload) {
  return sendPushPlus({
    title: payload.title || '农场成熟提醒',
    content: renderFarmMessage(payload),
    template: 'html',
    token: payload.token,
    channel: payload.channel,
  });
}

module.exports = {
  isEnabled,
  sendPushPlus,
  sendFarmReminder,
  escapeHtml,
};

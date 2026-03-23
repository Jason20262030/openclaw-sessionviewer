const state = {
  tree: null,
  selected: null,
  currentSessionData: null,
  lineToMessageId: {},
  messageIdToLine: {},
  activeView: "session",
  fontSize: "medium",
  messageJsonView: {},
};

const FONT_SIZE_KEY = "sessionviewer-font-size";
const FONT_SIZE_MAP = {
  small: { size: "12px", lineHeight: "1.6" },
  medium: { size: "14px", lineHeight: "1.7" },
  large: { size: "16px", lineHeight: "1.8" },
};

const el = {
  rootPath: document.getElementById("rootPath"),
  refreshBtn: document.getElementById("refreshBtn"),
  sessionTree: document.getElementById("sessionTree"),
  contentTitle: document.getElementById("contentTitle"),
  contentMeta: document.getElementById("contentMeta"),
  notice: document.getElementById("notice"),
  sessionView: document.getElementById("sessionView"),
  thinkingView: document.getElementById("thinkingView"),
  treeView: document.getElementById("treeView"),
  rawView: document.getElementById("rawView"),
  rawText: document.getElementById("rawText"),
  viewSelect: document.getElementById("viewSelect"),
  fontSizeSelect: document.getElementById("fontSizeSelect"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function primitiveClassName(value) {
  if (value === null) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "string";
}

function primitiveDisplay(value) {
  if (value === null) return "null";
  if (typeof value === "string") {
    return `"${escapeHtml(value)}"`;
  }
  return escapeHtml(String(value));
}

function parseFencedJson(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  const matched = trimmed.match(/^```json\s*([\s\S]*?)\s*```$/i);
  if (!matched) return null;
  const rawJson = matched[1];
  try {
    return {
      raw: rawJson,
      parsed: JSON.parse(rawJson),
    };
  } catch {
    return {
      raw: rawJson,
      parsed: null,
    };
  }
}

function renderJsonValue(key, value, depth = 0, options = {}) {
  const keyHtml = key !== null ? `<span class="json-key">${escapeHtml(String(key))}</span>: ` : "";

  if (value === null || ["string", "number", "boolean"].includes(typeof value)) {
    const cls = primitiveClassName(value);
    if (typeof value === "string" && options.highlightFencedJson) {
      const fenced = parseFencedJson(value);
      if (fenced) {
        const expanded = Boolean(options.jsonExpanded && fenced.parsed);
        if (expanded) {
          return `
            <div class="json-entry">${keyHtml}<span class="json-type">[JSON]</span></div>
            <div class="json-fenced-area">
              ${renderJsonValue(null, fenced.parsed, depth + 1, { ...options, highlightFencedJson: false })}
            </div>
          `;
        }
        return `
          <div class="json-entry">${keyHtml}<span class="json-type">[JSON文本]</span></div>
          <pre class="json-fenced-area raw">${escapeHtml(value)}</pre>
        `;
      }
    }
    return `<div class="json-entry">${keyHtml}<span class="json-value ${cls}">${primitiveDisplay(value)}</span></div>`;
  }

  if (Array.isArray(value)) {
    const open = " open";
    const itemsHtml = value
      .map((item, idx) => `<div class="json-node">${renderJsonValue(idx, item, depth + 1, options)}</div>`)
      .join("");
    return `
      <details class="json-collapsible"${open}>
        <summary class="json-entry">${keyHtml}[Array] <span class="json-type">(${value.length})</span></summary>
        <div class="json-node">${itemsHtml || '<div class="json-entry">[empty]</div>'}</div>
      </details>
    `;
  }

  const entries = Object.entries(value);
  const open = " open";
  const childrenHtml = entries
    .map(([childKey, childVal]) => `<div class="json-node">${renderJsonValue(childKey, childVal, depth + 1, options)}</div>`)
    .join("");
  return `
    <details class="json-collapsible"${open}>
      <summary class="json-entry">${keyHtml}{Object} <span class="json-type">(${entries.length})</span></summary>
      <div class="json-node">${childrenHtml || '<div class="json-entry">{empty}</div>'}</div>
    </details>
  `;
}

function buildStructuredContent(parsedEntries, rawText) {
  if (parsedEntries.length > 0) {
    const values = parsedEntries.map((entry) => entry.value);
    return values.length === 1 ? values[0] : values;
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return undefined;
  }
}

function switchView(mode) {
  state.activeView = mode;
  const isSession = mode === "session";
  const isThinking = mode === "thinking";
  const isTree = mode === "tree";
  const isRaw = mode === "raw";
  el.sessionView.classList.toggle("hidden", !isSession);
  el.thinkingView.classList.toggle("hidden", !isThinking);
  el.treeView.classList.toggle("hidden", !isTree);
  el.rawView.classList.toggle("hidden", !isRaw);
  if (el.viewSelect.value !== mode) {
    el.viewSelect.value = mode;
  }
}

function applyFontSize(mode) {
  const config = FONT_SIZE_MAP[mode] || FONT_SIZE_MAP.medium;
  state.fontSize = FONT_SIZE_MAP[mode] ? mode : "medium";
  document.documentElement.style.setProperty("--content-font-size", config.size);
  document.documentElement.style.setProperty("--content-line-height", config.lineHeight);
  if (el.fontSizeSelect.value !== state.fontSize) {
    el.fontSizeSelect.value = state.fontSize;
  }
  localStorage.setItem(FONT_SIZE_KEY, state.fontSize);
}

function loadFontSizePreference() {
  const saved = localStorage.getItem(FONT_SIZE_KEY);
  applyFontSize(saved || "medium");
}

function formatShortTimestamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const pad = (num) => String(num).padStart(2, "0");
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function omitType(value) {
  if (!isObject(value)) return value;
  const copied = { ...value };
  delete copied.type;
  return copied;
}

function renderNodeFields(nodeValue, options = {}) {
  const omitKeys = new Set(options.omitKeys || []);
  if (!isObject(nodeValue)) {
    return renderJsonValue(null, nodeValue, 0);
  }
  const entries = Object.entries(nodeValue).filter(([fieldKey]) => !omitKeys.has(fieldKey));
  if (!entries.length) return '<div class="json-entry">{empty}</div>';
  return entries
    .map(([fieldKey, fieldValue]) => {
      const messageClass = fieldKey === "message" ? " message-content-area" : "";
      const renderOptions = {
        highlightFencedJson: Boolean(options.highlightFencedJson),
        jsonExpanded: Boolean(options.jsonExpanded),
      };
      return `<div class="json-node${messageClass}">${renderJsonValue(fieldKey, fieldValue, 1, renderOptions)}</div>`;
    })
    .join("");
}

function renderTypedNode(title, nodeValue, childrenHtml = "", options = {}) {
  const hideFields = Boolean(options.hideFields);
  const fieldsHtml = hideFields
    ? ""
    : renderNodeFields(omitType(nodeValue), {
        omitKeys: options.omitKeys || [],
        highlightFencedJson: Boolean(options.highlightFencedJson),
        jsonExpanded: Boolean(options.jsonExpanded),
      });
  const actionHtml = options.actionHtml || "";
  const attrHtml = Object.entries(options.nodeAttrs || {})
    .map(([attr, attrValue]) => ` ${attr}="${escapeHtml(String(attrValue))}"`)
    .join("");
  return `
    <details class="session-node" open${attrHtml}>
      <summary class="json-entry">
        <span class="session-node-summary">
          <span class="session-node-title">${escapeHtml(title)}</span>
          ${actionHtml}
        </span>
      </summary>
      <div class="session-node-body">
        ${fieldsHtml}
        ${childrenHtml}
      </div>
    </details>
  `;
}

function orderMessagesByDependency(messages) {
  const wrappers = messages.map((entry, index) => ({
    index,
    line: entry.line,
    node: entry.value,
    children: [],
  }));
  const byId = new Map(
    wrappers
      .map((wrapper) => [wrapper.node.id, wrapper])
      .filter(([id]) => typeof id === "string" && id.length > 0),
  );

  for (const wrapper of wrappers) {
    const parentId = wrapper.node.parentId;
    if (typeof parentId === "string" && parentId.length > 0 && byId.has(parentId)) {
      byId.get(parentId).children.push(wrapper);
    }
  }

  const sortByIndex = (a, b) => a.index - b.index;
  wrappers.forEach((wrapper) => wrapper.children.sort(sortByIndex));

  const roots = wrappers.filter((wrapper) => {
    const parentId = wrapper.node.parentId;
    return !(typeof parentId === "string" && parentId.length > 0 && byId.has(parentId));
  });
  roots.sort(sortByIndex);

  const ordered = [];
  const visited = new Set();
  const appendChain = (wrapper) => {
    if (visited.has(wrapper)) return;
    visited.add(wrapper);
    ordered.push(wrapper);
    wrapper.children.forEach(appendChain);
  };

  roots.forEach(appendChain);
  wrappers.forEach((wrapper) => {
    if (!visited.has(wrapper)) appendChain(wrapper);
  });
  return ordered;
}

function renderMessageNode(wrapper) {
  const node = wrapper.node;
  const id = node.id || "unknown";
  const parentId = node.parentId || "root";
  const timestamp = formatShortTimestamp(node.timestamp);
  const label = `message · ${id} -> ${parentId}, ${timestamp}`;
  const fenced = parseFencedJsonFromMessage(node.message);
  const jsonToggle = fenced.hasAny
    ? `<button class="jump-line-btn json-toggle-btn" data-message-id="${escapeHtml(id)}" title="切换 JSON 文本/结构">${state.messageJsonView[id] ? "文本" : "JSON"}</button>`
    : "";
  const jumpBtn = Number.isFinite(wrapper.line)
    ? `<button class="jump-line-btn" data-line="${wrapper.line}" data-message-id="${escapeHtml(id)}" title="跳转到原文第 ${wrapper.line} 行">↗</button>`
    : "";
  const actionHtml = `<span class="message-node-actions">${jsonToggle}${jumpBtn}</span>`;
  return renderTypedNode(label, node, "", {
    hideFields: false,
    omitKeys: ["id", "parentId", "timestamp"],
    actionHtml,
    highlightFencedJson: true,
    jsonExpanded: Boolean(state.messageJsonView[id]),
    nodeAttrs: {
      "data-message-id": id,
      "data-message-line": Number.isFinite(wrapper.line) ? wrapper.line : "",
    },
  });
}

function parseFencedJsonFromMessage(messageObject) {
  const result = { hasAny: false, hasParseable: false };
  const walk = (value) => {
    if (typeof value === "string") {
      const fenced = parseFencedJson(value);
      if (fenced) {
        result.hasAny = true;
        if (fenced.parsed) result.hasParseable = true;
      }
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (value && typeof value === "object") {
      Object.values(value).forEach(walk);
    }
  };
  walk(messageObject);
  return result;
}

function renderSessionView(parsedEntries, structuredContent) {
  if (!parsedEntries.length) {
    if (structuredContent === undefined) {
      return `<div class="json-entry">该文件无法解析为 JSON/JSONL，请切换到“原始文本”查看。</div>`;
    }
    return renderJsonValue(null, structuredContent, 0);
  }

  const typedEntries = parsedEntries.filter((entry) => isObject(entry.value) && typeof entry.value.type === "string");
  if (!typedEntries.length) {
    return renderJsonValue(null, structuredContent, 0);
  }

  const sessionEntries = typedEntries.filter((entry) => entry.value.type === "session");
  const messageEntries = typedEntries.filter((entry) => entry.value.type === "message");
  const otherEntries = typedEntries.filter((entry) => entry.value.type !== "session" && entry.value.type !== "message");
  const untypedEntries = parsedEntries.filter((entry) => !typedEntries.includes(entry));

  const blocks = [];

  sessionEntries.forEach((entry, idx) => {
    const title = idx === 0 ? "session" : `session ${idx + 1}`;
    blocks.push(renderTypedNode(title, entry.value));
  });

  otherEntries.forEach((entry) => {
    const node = entry.value;
    const title = node.id ? `${node.type} · ${node.id}` : node.type;
    blocks.push(renderTypedNode(title, node));
  });

  if (messageEntries.length) {
    const messageListHtml = orderMessagesByDependency(messageEntries).map((item) => renderMessageNode(item)).join("");
    blocks.push(`
      <details class="session-node" open>
        <summary class="json-entry">
          <span class="session-node-title">message（依赖顺序）</span>
        </summary>
        <div class="session-node-body">
          ${messageListHtml}
        </div>
      </details>
    `);
  }

  untypedEntries.forEach((entry, idx) => {
    blocks.push(renderTypedNode(`entry ${idx + 1}`, entry.value));
  });

  return blocks.join("") || '<div class="json-entry">[empty]</div>';
}

function collectRoleContents(role, message) {
  const content = Array.isArray(message?.content) ? message.content : [];
  if (role === "user") {
    return content
      .filter((item) => item && item.type === "text" && typeof item.text === "string")
      .map((item) => ({ kind: "user-text", text: item.text }));
  }
  if (role === "assistant") {
    return content
      .map((item) => {
        if (!item) return null;
        if (item.type === "thinking") {
          const text = typeof item.thinking === "string" ? item.thinking : typeof item.text === "string" ? item.text : "";
          return text ? { kind: "assistant-thinking", text } : null;
        }
        if (item.type === "text" && typeof item.text === "string") {
          return { kind: "assistant-text", text: item.text };
        }
        return null;
      })
      .filter(Boolean);
  }
  return [];
}

function renderThinkingView(parsedEntries) {
  const messageEntries = parsedEntries.filter((entry) => isObject(entry.value) && entry.value.type === "message");
  if (!messageEntries.length) {
    return '<div class="json-entry">没有可展示的 message 内容。</div>';
  }

  const blocks = [];
  const ordered = orderMessagesByDependency(messageEntries);
  for (const wrapper of ordered) {
    const node = wrapper.node;
    const role = node?.message?.role;
    const normalizedRole = typeof role === "string" ? role.toLowerCase() : "";
    const id = node?.id || "unknown";
    const parentId = node?.parentId || "root";
    const ts = formatShortTimestamp(node?.timestamp);
    const baseTitle = `${role || "unknown"} · ${id} -> ${parentId}, ${ts}`;
    if (normalizedRole === "toolresult") {
      const toolName = node?.message?.toolName || "-";
      const isError = Boolean(node?.message?.isError);
      blocks.push(`
        <div class="thinking-item toolresult ${isError ? "error" : ""}">
          <div class="thinking-item-title">${escapeHtml(baseTitle)}</div>
          <div class="thinking-item-content">toolName: ${escapeHtml(toolName)}</div>
        </div>
      `);
      continue;
    }

    if (normalizedRole === "user" || normalizedRole === "assistant") {
      const contents = collectRoleContents(normalizedRole, node.message);
      if (!contents.length) continue;
      const contentHtml = contents
        .map((item) => {
          const extraClass = item.kind === "assistant-text" ? " assistant-reply" : "";
          return `<pre class="thinking-item-content${extraClass}">${escapeHtml(item.text)}</pre>`;
        })
        .join("");
      blocks.push(`
        <div class="thinking-item ${normalizedRole}">
          <div class="thinking-item-title">${escapeHtml(baseTitle)}</div>
          ${contentHtml}
        </div>
      `);
    }
  }

  return blocks.join("") || '<div class="json-entry">没有匹配到 user/assistant/toolResult 的目标内容。</div>';
}

function renderRawText(rawText) {
  const lines = rawText === "" ? [""] : rawText.split(/\r?\n/);
  const html = lines
    .map(
      (line, index) => `
        <div class="raw-line" data-line="${index + 1}">
          <span class="raw-line-no">${index + 1}</span>
          <span class="raw-line-content">${escapeHtml(line || " ")}</span>
          ${
            state.lineToMessageId[index + 1]
              ? `<button class="raw-back-btn" data-message-id="${escapeHtml(state.lineToMessageId[index + 1])}" title="返回对应 message">↩</button>`
              : ""
          }
        </div>
      `,
    )
    .join("");
  el.rawText.innerHTML = html;
}

function jumpToRawLine(line) {
  const lineNumber = Number(line);
  if (!Number.isFinite(lineNumber) || lineNumber <= 0) return;
  switchView("raw");
  requestAnimationFrame(() => {
    const target = el.rawText.querySelector(`.raw-line[data-line="${lineNumber}"]`);
    if (!target) return;
    el.rawText.querySelectorAll(".raw-line.focused").forEach((row) => row.classList.remove("focused"));
    target.classList.add("focused");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function jumpToMessage(messageId) {
  if (!messageId) return;
  switchView("session");
  requestAnimationFrame(() => {
    const target = Array.from(el.sessionView.querySelectorAll(".session-node")).find(
      (node) => node.dataset.messageId === messageId,
    );
    if (!target) return;
    el.sessionView.querySelectorAll(".session-node.focused-message").forEach((node) => node.classList.remove("focused-message"));
    target.classList.add("focused-message");
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function buildSidebar(tree) {
  const fragment = document.createDocumentFragment();

  if (!tree.agents.length) {
    const empty = document.createElement("p");
    empty.className = "subtle";
    empty.textContent = "没有检测到 agent sessions 目录。";
    fragment.appendChild(empty);
    return fragment;
  }

  for (const agentInfo of tree.agents) {
    const details = document.createElement("details");
    details.open = true;

    const summary = document.createElement("summary");
    summary.textContent = `${agentInfo.agent} (${agentInfo.sessions.length})`;
    details.appendChild(summary);

    const fileList = document.createElement("div");
    fileList.className = "file-list";

    if (!agentInfo.sessions.length) {
      const empty = document.createElement("p");
      empty.className = "subtle";
      empty.textContent = "sessions 目录为空";
      fileList.appendChild(empty);
    } else {
      for (const session of agentInfo.sessions) {
        const button = document.createElement("button");
        button.className = "session-item";
        button.dataset.agent = agentInfo.agent;
        button.dataset.file = session.relativePath;

        const displayName = session.relativePath;
        const lineCount = Number.isFinite(session.lineCount) ? session.lineCount : "-";
        const parseErrorCount = Number.isFinite(session.parseErrorCount) ? session.parseErrorCount : "-";
        const hasParseError = Number(parseErrorCount) > 0;
        button.innerHTML = `
          <div class="name">${escapeHtml(displayName)}</div>
          <div class="meta">${lineCount} 行 · <span class="${hasParseError ? "meta-error" : ""}">错误 ${parseErrorCount}</span> · ${formatBytes(session.size)} · ${new Date(session.updatedAt).toLocaleString()}</div>
        `;

        button.addEventListener("click", () => selectSession(agentInfo.agent, session.relativePath));
        fileList.appendChild(button);
      }
    }

    details.appendChild(fileList);
    fragment.appendChild(details);
  }

  return fragment;
}

function setSelectedButton(agent, file) {
  const all = el.sessionTree.querySelectorAll(".session-item");
  for (const btn of all) {
    const active = btn.dataset.agent === agent && btn.dataset.file === file;
    btn.classList.toggle("active", active);
  }
}

function renderSession(data) {
  const { meta, parsedEntries, parseErrors, rawText } = data;
  state.currentSessionData = data;
  state.lineToMessageId = {};
  state.messageIdToLine = {};
  parsedEntries.forEach((entry) => {
    const value = entry.value;
    if (!value || typeof value !== "object" || value.type !== "message" || !value.id) return;
    state.lineToMessageId[entry.line] = value.id;
    state.messageIdToLine[value.id] = entry.line;
  });
  el.contentTitle.textContent = `${meta.agent} / ${meta.relativePath}`;
  el.contentMeta.textContent = `更新时间: ${new Date(meta.updatedAt).toLocaleString()} · 大小: ${formatBytes(meta.size)} · 行数: ${meta.lineCount}`;
  el.notice.classList.add("hidden");

  const structuredContent = buildStructuredContent(parsedEntries, rawText || "");
  const wrapper = document.createElement("div");
  wrapper.insertAdjacentHTML("beforeend", renderSessionView(parsedEntries, structuredContent));
  if (structuredContent === undefined && parseErrors.length > 0) {
    el.notice.classList.remove("hidden");
    el.notice.textContent = `提示：该文件包含 ${parseErrors.length} 行非 JSON 内容，因此仅支持原始文本直读。`;
  }
  el.sessionView.innerHTML = "";
  el.sessionView.appendChild(wrapper);

  const thinkingWrapper = document.createElement("div");
  thinkingWrapper.insertAdjacentHTML("beforeend", renderThinkingView(parsedEntries));
  el.thinkingView.innerHTML = "";
  el.thinkingView.appendChild(thinkingWrapper);

  const treeWrapper = document.createElement("div");
  if (structuredContent === undefined) {
    treeWrapper.innerHTML = `<div class="json-entry">该文件无法解析为 JSON/JSONL，请切换到“原始文本”查看。</div>`;
  } else {
    treeWrapper.insertAdjacentHTML("beforeend", renderJsonValue(null, structuredContent, 0));
  }
  el.treeView.innerHTML = "";
  el.treeView.appendChild(treeWrapper);

  renderRawText(rawText || "");
}

function renderError(message) {
  state.currentSessionData = null;
  el.contentTitle.textContent = "加载失败";
  el.contentMeta.textContent = "";
  el.notice.classList.remove("hidden");
  el.notice.textContent = message;
  el.sessionView.innerHTML = "";
  el.thinkingView.innerHTML = "";
  el.treeView.innerHTML = "";
  el.rawText.innerHTML = "";
}

async function selectSession(agent, file) {
  state.selected = { agent, file };
  setSelectedButton(agent, file);
  el.contentTitle.textContent = "加载中...";
  el.contentMeta.textContent = `${agent} / ${file}`;
  el.sessionView.innerHTML = "";
  el.thinkingView.innerHTML = "";
  el.treeView.innerHTML = "";

  try {
    const res = await fetch(`/api/session?agent=${encodeURIComponent(agent)}&file=${encodeURIComponent(file)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "读取失败");
    }
    renderSession(data);
  } catch (error) {
    renderError(`无法读取 session：${error.message || error}`);
  }
}

async function loadTree() {
  el.sessionTree.innerHTML = `<p class="subtle">正在扫描 .openclaw...</p>`;
  try {
    const res = await fetch("/api/tree");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "读取目录失败");
    }
    state.tree = data;
    el.rootPath.textContent = `扫描路径: ${data.openclawDir}`;
    el.sessionTree.innerHTML = "";
    el.sessionTree.appendChild(buildSidebar(data));
  } catch (error) {
    el.sessionTree.innerHTML = `<p class="subtle">加载失败：${escapeHtml(error.message || String(error))}</p>`;
  }
}

el.refreshBtn.addEventListener("click", async () => {
  await loadTree();
  if (state.selected) {
    await selectSession(state.selected.agent, state.selected.file);
  }
});

el.viewSelect.addEventListener("change", (event) => switchView(event.target.value));
el.sessionView.addEventListener("click", (event) => {
  const jumpBtn = event.target.closest(".jump-line-btn");
  if (jumpBtn) {
    event.preventDefault();
    event.stopPropagation();
    if (jumpBtn.classList.contains("json-toggle-btn")) {
      const messageId = jumpBtn.dataset.messageId;
      if (messageId) {
        state.messageJsonView[messageId] = !state.messageJsonView[messageId];
        if (state.currentSessionData) renderSession(state.currentSessionData);
      }
      return;
    }
    jumpToRawLine(jumpBtn.dataset.line);
  }
});
el.rawView.addEventListener("click", (event) => {
  const backBtn = event.target.closest(".raw-back-btn");
  if (!backBtn) return;
  event.preventDefault();
  event.stopPropagation();
  jumpToMessage(backBtn.dataset.messageId);
});
el.fontSizeSelect.addEventListener("change", (event) => {
  applyFontSize(event.target.value);
});

loadFontSizePreference();
loadTree();

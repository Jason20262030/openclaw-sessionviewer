const state = {
  tree: null,
  selected: null,
  currentSessionData: null,
  lineToMessageId: {},
  messageIdToLine: {},
  activeView: "session",
  fontSize: "medium",
  language: "en",
  messageJsonView: {},
};

const FONT_SIZE_KEY = "sessionviewer-font-size";
const LANGUAGE_KEY = "sessionviewer-language";
const FONT_SIZE_MAP = {
  small: { size: "12px", lineHeight: "1.6" },
  medium: { size: "14px", lineHeight: "1.7" },
  large: { size: "16px", lineHeight: "1.8" },
};

const I18N = {
  en: {
    languageLabel: "Language",
    refresh: "Refresh",
    selectSessionTitle: "Select a session file from the left panel",
    viewLabel: "View",
    viewSession: "Session View",
    viewThinking: "Thinking View",
    viewTree: "Tree View",
    viewRaw: "Raw Text",
    fontLabel: "Font",
    fontSmall: "Small",
    fontMedium: "Medium",
    fontLarge: "Large",
    noticeDefault:
      "Session files are grouped by agent in the left panel. Click one to inspect structured content and raw text on the right.",
    jsonText: "[JSON Text]",
    arrayLabel: "[Array]",
    objectLabel: "{Object}",
    emptyArray: "[empty]",
    emptyObject: "{empty}",
    parseOnlyRaw: "This file cannot be parsed as JSON/JSONL. Switch to Raw Text to view it.",
    messageDependencyOrder: "message (dependency order)",
    noMessageContent: "No message content available.",
    noMatchingContent: "No matched user/assistant/toolResult content.",
    backToMessage: "Back to related message",
    noAgentSessions: "No agent sessions directory detected.",
    emptySessionsDir: "sessions directory is empty",
    lineCount: "{n} lines",
    parseErrors: "errors {n}",
    updatedAt: "Updated: {v}",
    size: "Size: {v}",
    lines: "Lines: {v}",
    parseNotice: "Note: this file contains {n} non-JSON lines, so only raw text reading is supported.",
    loadFailed: "Load failed",
    loading: "Loading...",
    readFailed: "Read failed",
    readSessionFailed: "Cannot read session: {msg}",
    scanning: "Scanning .openclaw...",
    loadFailedWithReason: "Load failed: {msg}",
    readDirFailed: "Failed to read directory",
    scanPath: "Scan path: {path}",
    toggleJsonText: "Toggle JSON text/structure",
    jumpToLine: "Jump to raw line {line}",
    plainText: "Text",
    jsonMode: "JSON",
    invalidJsonRawOnly: "This file cannot be parsed as JSON/JSONL. Switch to Raw Text to view it.",
  },
  "zh-CN": {
    languageLabel: "语言",
    refresh: "刷新",
    selectSessionTitle: "请选择左侧 Session 文件",
    viewLabel: "视图",
    viewSession: "Session视图",
    viewThinking: "Thinking视图",
    viewTree: "树形视图",
    viewRaw: "原始文本",
    fontLabel: "字体",
    fontSmall: "小",
    fontMedium: "中",
    fontLarge: "大",
    noticeDefault: "左侧自动按 agent 分组展示 sessions 文件，点击后可在右侧查看结构化内容和原始数据。",
    jsonText: "[JSON文本]",
    arrayLabel: "[数组]",
    objectLabel: "{对象}",
    emptyArray: "[空]",
    emptyObject: "{空}",
    parseOnlyRaw: "该文件无法解析为 JSON/JSONL，请切换到“原始文本”查看。",
    messageDependencyOrder: "message（依赖顺序）",
    noMessageContent: "没有可展示的 message 内容。",
    noMatchingContent: "没有匹配到 user/assistant/toolResult 的目标内容。",
    backToMessage: "返回对应 message",
    noAgentSessions: "没有检测到 agent sessions 目录。",
    emptySessionsDir: "sessions 目录为空",
    lineCount: "{n} 行",
    parseErrors: "错误 {n}",
    updatedAt: "更新时间: {v}",
    size: "大小: {v}",
    lines: "行数: {v}",
    parseNotice: "提示：该文件包含 {n} 行非 JSON 内容，因此仅支持原始文本直读。",
    loadFailed: "加载失败",
    loading: "加载中...",
    readFailed: "读取失败",
    readSessionFailed: "无法读取 session：{msg}",
    scanning: "正在扫描 .openclaw...",
    loadFailedWithReason: "加载失败：{msg}",
    readDirFailed: "读取目录失败",
    scanPath: "扫描路径: {path}",
    toggleJsonText: "切换 JSON 文本/结构",
    jumpToLine: "跳转到原文第 {line} 行",
    plainText: "文本",
    jsonMode: "JSON",
    invalidJsonRawOnly: "该文件无法解析为 JSON/JSONL，请切换到“原始文本”查看。",
  },
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
  languageSelect: document.getElementById("languageSelect"),
  languageLabel: document.getElementById("languageLabel"),
  viewLabel: document.getElementById("viewLabel"),
  viewOptionSession: document.getElementById("viewOptionSession"),
  viewOptionThinking: document.getElementById("viewOptionThinking"),
  viewOptionTree: document.getElementById("viewOptionTree"),
  viewOptionRaw: document.getElementById("viewOptionRaw"),
  fontSizeLabel: document.getElementById("fontSizeLabel"),
  fontSizeOptionSmall: document.getElementById("fontSizeOptionSmall"),
  fontSizeOptionMedium: document.getElementById("fontSizeOptionMedium"),
  fontSizeOptionLarge: document.getElementById("fontSizeOptionLarge"),
};

function t(key, vars = {}) {
  const dict = I18N[state.language] || I18N.en;
  const fallback = I18N.en[key] || key;
  const template = dict[key] || fallback;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => (vars[name] == null ? "" : String(vars[name])));
}

function getLocale() {
  return state.language === "zh-CN" ? "zh-CN" : "en-US";
}

function detectDefaultLanguage() {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  if (saved === "en" || saved === "zh-CN") return saved;
  const nav = String(navigator.language || "").toLowerCase();
  return nav.startsWith("zh") ? "zh-CN" : "en";
}

function applyLanguage(lang) {
  state.language = lang === "zh-CN" ? "zh-CN" : "en";
  if (el.languageSelect.value !== state.language) {
    el.languageSelect.value = state.language;
  }
  localStorage.setItem(LANGUAGE_KEY, state.language);
  document.documentElement.lang = state.language;

  el.languageLabel.textContent = t("languageLabel");
  el.refreshBtn.textContent = t("refresh");
  el.viewLabel.textContent = t("viewLabel");
  el.viewOptionSession.textContent = t("viewSession");
  el.viewOptionThinking.textContent = t("viewThinking");
  el.viewOptionTree.textContent = t("viewTree");
  el.viewOptionRaw.textContent = t("viewRaw");
  el.fontSizeLabel.textContent = t("fontLabel");
  el.fontSizeOptionSmall.textContent = t("fontSmall");
  el.fontSizeOptionMedium.textContent = t("fontMedium");
  el.fontSizeOptionLarge.textContent = t("fontLarge");

  if (state.currentSessionData) {
    renderSession(state.currentSessionData);
  } else if (!state.selected) {
    el.contentTitle.textContent = t("selectSessionTitle");
    el.notice.textContent = t("noticeDefault");
  }
  if (state.tree) {
    el.rootPath.textContent = t("scanPath", { path: state.tree.openclawDir });
    el.sessionTree.innerHTML = "";
    el.sessionTree.appendChild(buildSidebar(state.tree));
    if (state.selected) {
      setSelectedButton(state.selected.agent, state.selected.file);
    }
  }
}

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
          <div class="json-entry">${keyHtml}<span class="json-type">${t("jsonText")}</span></div>
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
        <summary class="json-entry">${keyHtml}${t("arrayLabel")} <span class="json-type">(${value.length})</span></summary>
        <div class="json-node">${itemsHtml || `<div class="json-entry">${t("emptyArray")}</div>`}</div>
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
      <summary class="json-entry">${keyHtml}${t("objectLabel")} <span class="json-type">(${entries.length})</span></summary>
      <div class="json-node">${childrenHtml || `<div class="json-entry">${t("emptyObject")}</div>`}</div>
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
  if (!entries.length) return `<div class="json-entry">${t("emptyObject")}</div>`;
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
    ? `<button class="jump-line-btn json-toggle-btn" data-message-id="${escapeHtml(id)}" title="${escapeHtml(t("toggleJsonText"))}">${state.messageJsonView[id] ? t("plainText") : t("jsonMode")}</button>`
    : "";
  const jumpBtn = Number.isFinite(wrapper.line)
    ? `<button class="jump-line-btn" data-line="${wrapper.line}" data-message-id="${escapeHtml(id)}" title="${escapeHtml(
        t("jumpToLine", { line: wrapper.line }),
      )}">↗</button>`
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
      return `<div class="json-entry">${t("invalidJsonRawOnly")}</div>`;
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
          <span class="session-node-title">${t("messageDependencyOrder")}</span>
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

  return blocks.join("") || `<div class="json-entry">${t("emptyArray")}</div>`;
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
    return `<div class="json-entry">${t("noMessageContent")}</div>`;
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

  return blocks.join("") || `<div class="json-entry">${t("noMatchingContent")}</div>`;
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
              ? `<button class="raw-back-btn" data-message-id="${escapeHtml(state.lineToMessageId[index + 1])}" title="${escapeHtml(
                  t("backToMessage"),
                )}">↩</button>`
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
    empty.textContent = t("noAgentSessions");
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
      empty.textContent = t("emptySessionsDir");
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
        const metaDate = new Date(session.updatedAt).toLocaleString(getLocale());
        button.innerHTML = `
          <div class="name">${escapeHtml(displayName)}</div>
          <div class="meta">${t("lineCount", { n: lineCount })} · <span class="${hasParseError ? "meta-error" : ""}">${t(
            "parseErrors",
            { n: parseErrorCount },
          )}</span> · ${formatBytes(session.size)} · ${metaDate}</div>
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
  const updatedText = t("updatedAt", { v: new Date(meta.updatedAt).toLocaleString(getLocale()) });
  const sizeText = t("size", { v: formatBytes(meta.size) });
  const linesText = t("lines", { v: meta.lineCount });
  el.contentMeta.textContent = `${updatedText} · ${sizeText} · ${linesText}`;
  el.notice.classList.add("hidden");

  const structuredContent = buildStructuredContent(parsedEntries, rawText || "");
  const wrapper = document.createElement("div");
  wrapper.insertAdjacentHTML("beforeend", renderSessionView(parsedEntries, structuredContent));
  if (structuredContent === undefined && parseErrors.length > 0) {
    el.notice.classList.remove("hidden");
    el.notice.textContent = t("parseNotice", { n: parseErrors.length });
  }
  el.sessionView.innerHTML = "";
  el.sessionView.appendChild(wrapper);

  const thinkingWrapper = document.createElement("div");
  thinkingWrapper.insertAdjacentHTML("beforeend", renderThinkingView(parsedEntries));
  el.thinkingView.innerHTML = "";
  el.thinkingView.appendChild(thinkingWrapper);

  const treeWrapper = document.createElement("div");
  if (structuredContent === undefined) {
    treeWrapper.innerHTML = `<div class="json-entry">${t("parseOnlyRaw")}</div>`;
  } else {
    treeWrapper.insertAdjacentHTML("beforeend", renderJsonValue(null, structuredContent, 0));
  }
  el.treeView.innerHTML = "";
  el.treeView.appendChild(treeWrapper);

  renderRawText(rawText || "");
}

function renderError(message) {
  state.currentSessionData = null;
  el.contentTitle.textContent = t("loadFailed");
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
  el.contentTitle.textContent = t("loading");
  el.contentMeta.textContent = `${agent} / ${file}`;
  el.sessionView.innerHTML = "";
  el.thinkingView.innerHTML = "";
  el.treeView.innerHTML = "";

  try {
    const res = await fetch(`/api/session?agent=${encodeURIComponent(agent)}&file=${encodeURIComponent(file)}`);
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || t("readFailed"));
    }
    renderSession(data);
  } catch (error) {
    renderError(t("readSessionFailed", { msg: error.message || error }));
  }
}

async function loadTree() {
  el.sessionTree.innerHTML = `<p class="subtle">${t("scanning")}</p>`;
  try {
    const res = await fetch("/api/tree");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || t("readDirFailed"));
    }
    state.tree = data;
    el.rootPath.textContent = t("scanPath", { path: data.openclawDir });
    el.sessionTree.innerHTML = "";
    el.sessionTree.appendChild(buildSidebar(data));
  } catch (error) {
    el.sessionTree.innerHTML = `<p class="subtle">${escapeHtml(t("loadFailedWithReason", { msg: error.message || String(error) }))}</p>`;
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
el.languageSelect.addEventListener("change", (event) => {
  applyLanguage(event.target.value);
});

loadFontSizePreference();
applyLanguage(detectDefaultLanguage());
loadTree();

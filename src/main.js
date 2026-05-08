import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';

import { buildCompilationUnit } from './compilation.js';
import { files as initialFiles } from './files.js';
import { findDefinition } from './go-to-definition.js';

self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};

const editor = monaco.editor.create(document.getElementById('editor'), {
  model: null,
  theme: 'vs',
  automaticLayout: true,
  minimap: { enabled: false },
  fontSize: 14,
});

const fileListEl = document.getElementById('file-list');
const uploadBtn = document.getElementById('upload-btn');
const uploadInput = document.getElementById('upload-input');
const uploadError = document.getElementById('upload-error');

let models = {};
let fileItems = {};
let activeSourceName = null;

function showError(msg) {
  uploadError.textContent = msg;
  uploadError.hidden = !msg;
}

function disposeModels() {
  for (const model of Object.values(models)) model.dispose();
  models = {};
  fileItems = {};
  fileListEl.innerHTML = '';
  activeSourceName = null;
  // Invalidate any in-flight build and the cached unit; the new sources will
  // trigger a fresh build via loadSources -> rebuildUnit.
  buildGeneration++;
  currentUnit = null;
}

function selectFile(sourceName) {
  activeSourceName = sourceName;
  editor.setModel(models[sourceName]);
  for (const [name, el] of Object.entries(fileItems)) {
    el.classList.toggle('active', name === sourceName);
  }
}

function loadSources(sources) {
  disposeModels();

  const names = Object.keys(sources).sort();
  for (const name of names) {
    const content = sources[name];
    models[name] = monaco.editor.createModel(
      content,
      'sol',
      monaco.Uri.file('/' + name),
    );

    const item = document.createElement('div');
    item.className = 'file-item';
    item.textContent = name;
    item.title = name;
    item.addEventListener('click', () => selectFile(name));
    fileListEl.appendChild(item);
    fileItems[name] = item;
  }

  for (const model of Object.values(models)) {
    model.onDidChangeContent(scheduleRebuild);
  }

  if (names.length > 0) selectFile(names[0]);

  rebuildUnit();
}

let currentUnit = null;
let buildGeneration = 0;
let rebuildTimer = null;

function snapshotSources() {
  const out = {};
  for (const [name, model] of Object.entries(models)) {
    out[name] = model.getValue();
  }
  return out;
}

function rebuildUnit() {
  clearTimeout(rebuildTimer);
  const generation = ++buildGeneration;
  buildCompilationUnit(snapshotSources()).then(
    (unit) => {
      if (generation !== buildGeneration) return;
      currentUnit = unit;
      console.log('[slang] compilation unit built', unit);
    },
    (err) => {
      if (generation !== buildGeneration) return;
      console.error('[slang] compilation failed', err);
    },
  );
}

function scheduleRebuild() {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(rebuildUnit, 300);
}

function sourceNameFromUri(uri) {
  return uri.path.replace(/^\//, '');
}

monaco.languages.registerDefinitionProvider('sol', {
  provideDefinition(model, position) {
    if (!currentUnit) return null;
    const sourceName = sourceNameFromUri(model.uri);
    const result = findDefinition(currentUnit, sourceName, position);
    if (!result) return null;
    return {
      uri: monaco.Uri.file('/' + result.sourceName),
      range: result.range,
    };
  },
});

function sourcesFromSolcInput(json) {
  if (!json || typeof json !== 'object') {
    throw new Error('Not a JSON object');
  }
  if (!json.sources || typeof json.sources !== 'object') {
    throw new Error('Missing "sources" object');
  }
  const out = {};
  for (const [name, entry] of Object.entries(json.sources)) {
    if (entry && typeof entry.content === 'string') {
      out[name] = entry.content;
    }
    // Skip URL-form sources silently — out of scope for this PoC.
  }
  if (Object.keys(out).length === 0) {
    throw new Error('No inline sources found (only "content" form is supported)');
  }
  return out;
}

uploadBtn.addEventListener('click', () => uploadInput.click());

uploadInput.addEventListener('change', async () => {
  const file = uploadInput.files?.[0];
  if (!file) return;
  showError('');
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    const sources = sourcesFromSolcInput(json);
    loadSources(sources);
  } catch (err) {
    showError(`Failed to load ${file.name}: ${err.message}`);
  } finally {
    // Allow re-selecting the same file to trigger change again.
    uploadInput.value = '';
  }
});

loadSources(initialFiles);

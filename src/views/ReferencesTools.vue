<script setup lang="ts">
import {ref} from "vue";
import {ElMessage} from "element-plus";

const bibInput = ref("");
const output = ref("");

function parseBibtex(bib: string) {
  const entries = bib.split("@").filter(e => e.trim() !== "");
  const results: string[] = [];

  for (let entry of entries) {
    const typeMatch = entry.match(/^\w+/);
    const type = typeMatch ? typeMatch[0].toLowerCase() : "misc";

    const authorMatch = entry.match(/author=\{([^}]+)}/i);
    const titleMatch = entry.match(/title=\{([^}]+)}/i);
    const journalMatch = entry.match(/journal=\{([^}]+)}/i);
    const booktitleMatch = entry.match(/booktitle=\{([^}]+)}/i);
    const publisherMatch = entry.match(/publisher=\{([^}]+)}/i);
    const organizationMatch = entry.match(/organization=\{([^}]+)}/i);
    const schoolMatch = entry.match(/school=\{([^}]+)}/i);
    const yearMatch = entry.match(/year=\{([^}]+)}/i);
    const volumeMatch = entry.match(/volume=\{([^}]+)}/i);
    const numberMatch = entry.match(/number=\{([^}]+)}/i);
    const pagesMatch = entry.match(/pages=\{([^}]+)}/i);

    let authors = authorMatch ? authorMatch[1].split(" and ").map(a => formatAuthor(a)) : [];
    if (authors.length > 3) {
      authors = authors.slice(0, 3);
      authors.push("et al.");
    }
    const authorStr = authors.join(", ");

    const title = titleMatch ? formatTitle(titleMatch[1]) : "";
    const year = yearMatch ? yearMatch[1] : "";
    const pages = pagesMatch ? pagesMatch[1] : "";
    const volume = volumeMatch ? volumeMatch[1] : "";
    const number = numberMatch ? `(${numberMatch[1]})` : "";

    let ref = "";

    if (type === "article") {
      const journal = journalMatch ? journalMatch[1] : "";
      ref = `${authorStr}. ${title} [J]. ${journal}, ${year}, ${volume}${number}: ${pages}.`;
    } else if (type === "inproceedings") {
      const conf = booktitleMatch ? booktitleMatch[1] : "";
      let pub = organizationMatch ? organizationMatch[1] : (publisherMatch ? publisherMatch[1] : "IEEE");
      ref = `${authorStr}. ${title} [C]// ${conf}. Piscataway, NJ: ${pub}, ${year}: ${pages}.`;
    } else if (type === "book") {
      const publisher = publisherMatch ? publisherMatch[1] : "";
      ref = `${authorStr}. ${title} [M]. ${publisher}, ${year}.`;
    } else if (type === "phdthesis" || type === "mastersthesis") {
      const school = schoolMatch ? schoolMatch[1] : "";
      ref = `${authorStr}. ${title} [D]. ${school}, ${year}.`;
    } else {
      ref = `${authorStr}. ${title} [R]. ${year}.`;
    }

    results.push(ref);
  }

  return results.join("\n\n");
}

function formatAuthor(name: string) {
  name = name.trim();
  const parts = name.split(",").map(p => p.trim());
  if (parts.length === 2) {
    return `${parts[0]} ${parts[1].split(" ")[0][0]}`;
  } else {
    const arr = name.split(" ");
    return `${arr[arr.length - 1]} ${arr[0][0]}`;
  }
}

function formatTitle(title: string) {
  if (!title) return "";
  title = title.replace(/[{}]/g, "");
  return title.charAt(0).toUpperCase() + title.slice(1);
}

function convert() {
  output.value = parseBibtex(bibInput.value);
}

function copyOutput() {
  navigator.clipboard.writeText(output.value).then(() => {
    ElMessage.success("Copied!");
  }).catch(err => {
    ElMessage.error("Failed to copy: " + err);
  });
}

function exportCSV() {
  if (!bibInput.value.trim()) {
    alert("请先粘贴并转换 BibTeX 条目再导出。");
    return;
  }

  const entries = bibInput.value.split("@").filter(e => e.trim() !== "");
  const formattedRefs = output.value.split("\n\n");

  let csvContent = "序号,标识符,参考文献\n";

  entries.forEach((entry, idx) => {
    const keyMatch = entry.match(/^\w+\{([^,]+)/);
    const key = keyMatch ? keyMatch[1].trim() : `ref${idx + 1}`;
    const ref = formattedRefs[idx] ? formattedRefs[idx].replace(/\n/g, " ") : "";
    csvContent += `${idx + 1},"${key}","${ref}"\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", "references.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<template>
  <div id="references" class="tool-page">
    <header class="tool-header">
      <span class="tool-eyebrow">Research utility</span>
      <h1 class="tool-title">参考文献格式转换</h1>
      <p class="tool-description">将一个或多个 BibTeX 条目整理为《计算机学报》参考文献格式，并支持复制或导出 CSV。</p>
    </header>

    <main class="references-workspace">
      <section class="editor-panel surface-card">
        <div class="panel-header">
          <div>
            <span class="panel-number">01</span>
            <div>
              <h2>BibTeX 输入</h2>
              <p>支持同时粘贴多条文献</p>
            </div>
          </div>
          <span class="format-chip">.BIB</span>
        </div>
        <textarea v-model="bibInput" rows="14" spellcheck="false" placeholder="@article{example,&#10;  author = {Author Name},&#10;  title = {Article Title},&#10;  journal = {Journal Name},&#10;  year = {2026}&#10;}"></textarea>
        <div class="primary-action">
          <span>粘贴完成后开始转换</span>
          <button class="convert-button" type="button" @click="convert">转换格式 <i>→</i></button>
        </div>
      </section>

      <section class="editor-panel output-panel surface-card">
        <div class="panel-header">
          <div>
            <span class="panel-number">02</span>
            <div>
              <h2>格式化结果</h2>
              <p>{{ output ? '结果已生成，可以复制或导出' : '等待转换内容' }}</p>
            </div>
          </div>
          <div v-if="output" class="output-actions">
            <button type="button" @click="copyOutput">复制</button>
            <button type="button" @click="exportCSV">导出 CSV</button>
          </div>
        </div>
        <pre v-if="output">{{ output }}</pre>
        <div v-else class="output-empty">
          <div class="paper-icon"><i></i><i></i><i></i></div>
          <p>转换后的参考文献会显示在这里</p>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
#references {
  width: 100%;
}

.references-workspace {
  width: min(100%, 1180px);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
  margin: 0 auto;
}

.editor-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: clamp(20px, 3vw, 30px);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;

  > div:first-child {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  h2 {
    margin: 0 0 3px;
    font-size: 1rem;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 0.68rem;
  }
}

.panel-number {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  place-items: center;
  border-radius: 9px;
  color: var(--accent-strong);
  background: var(--accent-soft);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.64rem;
}

.format-chip {
  padding: 6px 9px;
  border-radius: 8px;
  color: #7e8d88;
  background: var(--surface-soft);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.62rem;
  font-weight: 700;
}

textarea {
  width: 100%;
  min-height: 360px;
  flex: 1;
  padding: 18px;
  resize: vertical;
  border: 1px solid var(--line);
  border-radius: 15px;
  outline: none;
  color: #263d37;
  background: #f7faf9;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.7;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;

  &::placeholder {
    color: #a8b3af;
  }

  &:focus {
    border-color: var(--accent);
    background: #fff;
    box-shadow: 0 0 0 4px rgba(17, 168, 121, 0.1);
  }
}

.primary-action {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 16px;

  > span {
    color: var(--muted);
    font-size: 0.68rem;
  }
}

button {
  min-height: 40px;
  padding: 0 15px;
  border: 1px solid var(--line);
  border-radius: 10px;
  color: #334943;
  background: #f6faf8;
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 650;
  transition: border-color 0.2s ease, transform 0.2s ease, background 0.2s ease;

  &:hover {
    border-color: rgba(17, 168, 121, 0.34);
    transform: translateY(-1px);
  }
}

.convert-button {
  min-width: 128px;
  border-color: var(--accent);
  color: #fff;
  background: var(--accent);
  box-shadow: 0 9px 24px rgba(17, 168, 121, 0.2);

  i {
    margin-left: 10px;
    font-style: normal;
  }
}

.output-actions {
  display: flex;
  gap: 7px;
}

pre {
  width: 100%;
  min-height: 416px;
  max-height: 58vh;
  flex: 1;
  margin: 0;
  padding: 20px;
  overflow: auto;
  border: 1px solid rgba(46, 89, 76, 0.12);
  border-radius: 15px;
  color: #d6ebe4;
  background: #112c25;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.78rem;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-word;
}

.output-empty {
  min-height: 416px;
  display: grid;
  place-items: center;
  align-content: center;
  border: 1px dashed var(--line-strong);
  border-radius: 15px;
  color: var(--muted);
  background: #fafcfb;

  p {
    margin: 14px 0 0;
    font-size: 0.73rem;
  }
}

.paper-icon {
  width: 44px;
  height: 52px;
  display: grid;
  align-content: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid rgba(17, 168, 121, 0.18);
  border-radius: 11px;
  background: var(--accent-soft);

  i {
    height: 2px;
    border-radius: 99px;
    background: #54be9b;

    &:last-child { width: 60%; }
  }
}

@media (max-width: 980px) {
  .references-workspace {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .editor-panel {
    border-radius: 22px;
  }

  .primary-action {
    align-items: stretch;
    flex-direction: column;
  }

  .convert-button {
    width: 100%;
  }

  .output-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>

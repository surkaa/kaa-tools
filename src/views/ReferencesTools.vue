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
  <div id="references">
    <h2>BibTeX → 计算机学报参考文献格式</h2>
    <textarea v-model="bibInput" rows="10" placeholder="在这里粘贴BibTeX条目，可以多条"></textarea>
    <button @click="convert">转换</button>
    <button v-if="output" @click="copyOutput">复制输出</button>
    <button v-if="output" @click="exportCSV">导出为CSV</button>
    <h3>输出结果：</h3>
    <pre>{{ output }}</pre>
  </div>
</template>

<style scoped lang="scss">
#references {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 2rem;
  box-sizing: border-box;
}

h2 {
  margin-bottom: 1rem;
}

textarea {
  width: 100%;
  max-width: 900px;
  font-family: monospace;
  border: 1px solid #cbd5e0;
  border-radius: 0.5rem;
  padding: 1rem;
  resize: vertical;
  transition: border-color 0.2s ease;
}

textarea:focus {
  outline: none;
  box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.3);
}

button {
  border: none;
  border-radius: 0.5rem;
  padding: 0.6rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 1rem;
  transition: all 0.2s ease;
}

button:hover {
  transform: translateY(-1px);
}

button:active {
  transform: translateY(0);
}

h3 {
  margin-top: 2rem;
  margin-bottom: 0.5rem;
}

pre {
  width: 100%;
  max-width: 900px;
  border-radius: 0.5rem;
  padding: 1rem;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-x: auto;
}
</style>


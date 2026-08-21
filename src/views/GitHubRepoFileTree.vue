<script setup lang="ts">
import {ref} from 'vue'
import {ElMessage} from "element-plus";

const owner = ref('')
const repo = ref('')
const branch = ref('master')
const files = ref<string[]>([])
const loading = ref(false)

function fetchRepoTree() {
  if (!owner.value || !repo.value) {
    ElMessage.error('请输入 owner 和 repo')
    return
  }
  loading.value = true
  files.value = []
  const url = `https://api.github.com/repos/${owner.value}/${repo.value}/git/trees/${branch.value}?recursive=1`

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error(`请求失败: ${res.status}`)
      return res.json()
    })
    .then(data => {
      if (!data.tree) throw new Error('无效的返回数据')
      files.value = data.tree.map((item: any) => item.path)
    })
    .catch(e => {
      ElMessage.error(`错误: ${e.message}`)
      console.error(e)
    })
    .finally(() => {
      loading.value = false
    })
}

function copyOutput() {
  if (files.value.length === 0) {
    ElMessage.warning('没有可复制的内容')
    return
  }
  const output = files.value.join('\n')
  navigator.clipboard.writeText(output).then(() => {
    ElMessage.success('已复制到剪贴板')
  }).catch(() => {
    ElMessage.error('复制失败，请手动复制')
  })
}
</script>

<template>
  <div id="GitHubRepoFileTree" class="tool-page">
    <header class="tool-header">
      <span class="tool-eyebrow">Developer utility</span>
      <h1 class="tool-title">GitHub 仓库文件树</h1>
      <p class="tool-description">读取公开仓库的完整目录结构，快速复制为纯文本，用于文档、分析或上下文整理。</p>
    </header>

    <main class="repo-workspace">
      <section class="query-card surface-card">
        <div class="card-title">
          <div>
            <span class="step-number">01</span>
            <h2>仓库信息</h2>
          </div>
          <span>PUBLIC REPOSITORY</span>
        </div>

        <el-form class="repo-form" label-position="top">
          <div class="form-grid">
            <el-form-item label="仓库拥有者">
              <el-input v-model="owner" placeholder="例如：vuejs"/>
            </el-form-item>
            <el-form-item label="仓库名称">
              <el-input v-model="repo" placeholder="例如：core"/>
            </el-form-item>
            <el-form-item label="分支">
              <el-input v-model="branch" placeholder="默认：master"/>
            </el-form-item>
          </div>
          <div class="form-actions">
            <p>请输入公开仓库信息，结果会按 GitHub 返回的路径顺序展示。</p>
            <el-button type="primary" :loading="loading" @click="fetchRepoTree">获取文件目录</el-button>
          </div>
        </el-form>
      </section>

      <section v-if="files.length > 0" class="result-card surface-card">
        <div class="result-header">
          <div>
            <span class="step-number">02</span>
            <div>
              <h2>目录结果</h2>
              <p>共 {{ files.length }} 个路径</p>
            </div>
          </div>
          <el-button @click="copyOutput">复制全部</el-button>
        </div>
        <ul class="file-list">
          <li v-for="(file, index) in files" :key="file">
            <span>{{ String(index + 1).padStart(3, '0') }}</span>
            <code>{{ file }}</code>
          </li>
        </ul>
      </section>

      <section v-else class="empty-card">
        <div class="empty-symbol"><i></i><i></i><i></i></div>
        <h3>{{ loading ? '正在读取仓库目录' : '目录会显示在这里' }}</h3>
        <p>{{ loading ? '请稍候，正在向 GitHub 请求数据…' : '填写上方仓库信息并点击获取，即可查看完整文件树。' }}</p>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
#GitHubRepoFileTree {
  width: 100%;
}

.repo-workspace {
  width: min(100%, 1000px);
  display: grid;
  gap: 18px;
  margin: 0 auto;
}

.query-card,
.result-card {
  padding: clamp(22px, 4vw, 36px);
}

.card-title,
.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;

  > div {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  h2 {
    margin: 0;
    font-size: 1.05rem;
    letter-spacing: -0.02em;
  }

  > span {
    color: #93a19d;
    font-size: 0.64rem;
    font-weight: 750;
    letter-spacing: 0.14em;
  }
}

.step-number {
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

.repo-form {
  margin: 0;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

:deep(.el-form-item) {
  margin-bottom: 18px;
}

:deep(.el-form-item__label) {
  padding-bottom: 7px;
  font-size: 0.74rem;
  font-weight: 650;
}

:deep(.el-input__wrapper) {
  min-height: 48px;
  padding-inline: 15px;
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding-top: 20px;
  border-top: 1px solid var(--line);

  p {
    margin: 0;
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.6;
  }
}

.result-header {
  > div > div {
    h2 { margin: 0 0 3px; }

    p {
      margin: 0;
      color: var(--muted);
      font-size: 0.7rem;
    }
  }
}

.file-list {
  max-height: 46vh;
  margin: 0;
  padding: 7px;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: #f7faf9;
  list-style: none;

  li {
    display: grid;
    grid-template-columns: 38px minmax(0, 1fr);
    gap: 10px;
    padding: 10px 12px;
    border-radius: 9px;
    transition: background 0.18s ease;

    &:hover {
      background: #eaf4f0;
    }

    > span {
      color: #a1aca8;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 0.64rem;
    }

    code {
      min-width: 0;
      overflow-wrap: anywhere;
      color: #304a42;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 0.74rem;
    }
  }
}

.empty-card {
  min-height: 210px;
  display: grid;
  place-items: center;
  align-content: center;
  padding: 36px;
  border: 1px dashed rgba(23, 37, 34, 0.16);
  border-radius: 24px;
  text-align: center;

  h3 {
    margin: 18px 0 6px;
    color: #334a44;
    font-size: 0.95rem;
  }

  p {
    max-width: 440px;
    margin: 0;
    color: var(--muted);
    font-size: 0.76rem;
    line-height: 1.65;
  }
}

.empty-symbol {
  width: 52px;
  height: 42px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 5px;

  i {
    width: 9px;
    border-radius: 6px;
    background: #55c69f;

    &:nth-child(1) { height: 20px; opacity: 0.35; }
    &:nth-child(2) { height: 38px; }
    &:nth-child(3) { height: 28px; opacity: 0.62; }
  }
}

@media (max-width: 720px) {
  .form-grid {
    grid-template-columns: 1fr;
    gap: 0;
  }

  .form-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .query-card,
  .result-card {
    border-radius: 22px;
  }

  .card-title > span {
    display: none;
  }
}
</style>

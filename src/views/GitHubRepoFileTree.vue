<script setup lang="ts">
import {ref} from 'vue'
import {ElMessage} from "element-plus";

const owner = ref('SistrScarlet')
const repo = ref('LittleMaidModelLoader')
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
  <div id="GitHubRepoFileTree">
    <div>
      <el-form class="repo-form">
        <el-form-item>
          <el-input v-model="owner" label="仓库拥有者"/>
        </el-form-item>
        <el-form-item>
          <el-input v-model="repo" label="仓库名"/>
        </el-form-item>
        <el-form-item>
          <el-input v-model="branch" label="分支 (默认 master)"/>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="fetchRepoTree">获取目录</el-button>
        </el-form-item>
        <el-form-item v-if="files.length > 0">
          <el-button type="info" @click="copyOutput">复制输出结果</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div v-if="loading">加载中...</div>

    <ul class="file-list" v-if="files.length > 0">
      <li v-for="file in files" :key="file">{{ file }}</li>
    </ul>
  </div>
</template>

<style scoped lang="scss">
#GitHubRepoFileTree {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;

  .repo-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 20px;
  }

  .file-list {
    list-style: none;
    padding: 0;
    margin: 0;
    overflow-y: auto;
    flex-grow: 1;

    li {
      padding: 5px 10px;
      cursor: pointer;
    }
  }
}
</style>

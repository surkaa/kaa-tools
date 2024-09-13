<script setup lang="ts">
import {computed, onMounted, reactive, ref, watch} from "vue";
import generateSvg from "/src/assets/generate.svg";
import {ElMessage} from "element-plus";
import {Delete} from '@element-plus/icons-vue';

const RandomPasswordLocalStorageKey = 'RandomPasswordLocalStorageArgs';

interface RandomPasswordLocalStorageArgs {
  passwordLength: number;
  isContainLowercase: boolean;
  isContainUppercase: boolean;
  isContainNumber: boolean;
  isContainSymbol: boolean;
  copyHistory: string[];
  reloadAfterCopy: false;
}

const args = reactive<RandomPasswordLocalStorageArgs>({
  passwordLength: 16,
  isContainLowercase: true,
  isContainUppercase: true,
  isContainNumber: true,
  isContainSymbol: true,
  copyHistory: [],
  reloadAfterCopy: false,
});
const loadArgs = () => {
  const argsStr = localStorage.getItem(RandomPasswordLocalStorageKey);
  if (argsStr) {
    Object.assign(args, JSON.parse(argsStr));
  }
}
const password = ref('');
const lowercase = 'abcdefghijklmnopqrstuvwxyz';
const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const number = '0123456789';
const symbol = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const containArr = computed(() => {
  const arr = [];
  if (args.isContainLowercase) {
    arr.push(lowercase);
  }
  if (args.isContainUppercase) {
    arr.push(uppercase);
  }
  if (args.isContainNumber) {
    arr.push(number);
  }
  if (args.isContainSymbol) {
    arr.push(symbol);
  }
  return arr;
});

const generatePassword = () => {
  let str = '';
  const arr = containArr.value;
  if (arr.length === 0) {
    password.value = '';
    ElMessage.error('至少选择一种字符');
    return;
  }
  for (let i = 0; i < args.passwordLength; i++) {
    const randomIndex = Math.floor(Math.random() * arr.length);
    const randomStr = arr[randomIndex];
    const randomStrIndex = Math.floor(Math.random() * randomStr.length);
    str += randomStr[randomStrIndex];
  }
  password.value = str;

  // 触发旋转动画
  const generateBtn = document.querySelector('.generate-btn');
  if (generateBtn) {
    generateBtn.classList.add('rotate');
    generateBtn.addEventListener('animationend', () => {
      generateBtn.classList.remove('rotate');
    }, {once: true});
  }
}

const copyPassword = () => {
  if (!password.value) {
    return;
  }
  navigator.clipboard.writeText(password.value).then(() => {
    // 保存复制历史
    if (!args.copyHistory.includes(password.value)) {
      args.copyHistory.unshift(password.value);
    }
    ElMessage.success('复制成功');
    if (args.reloadAfterCopy) {
      generatePassword();
    }
  }).catch(err => {
    ElMessage.error('复制失败');
    console.error('复制失败:', err);
  });
}

watch(args, (newVal) => {
  // 保存到本地存储
  localStorage.setItem(RandomPasswordLocalStorageKey, JSON.stringify(newVal));
});

const deleteCopyHistory = (item: string) => {
  const index = args.copyHistory.indexOf(item);
  if (index !== -1) {
    args.copyHistory.splice(index, 1);
  }
}

const isEmptyHistory = computed(() => args.copyHistory.length === 0);

const removeAllHistory = () => {
  args.copyHistory = [];
}

onMounted(() => {
  loadArgs();
  generatePassword();
});
</script>

<template>
  <div id="random-password">
    <h1>Random Password</h1>
    <span>密码:</span>
    <span class="password">{{ password }}</span>
    <el-row
        :gutter="20"
        style="margin-bottom: 20px"
    >
      <el-checkbox v-model="args.isContainLowercase" @change="generatePassword">小写字母</el-checkbox>
      <el-checkbox v-model="args.isContainUppercase" @change="generatePassword">大写字母</el-checkbox>
      <el-checkbox v-model="args.isContainNumber" @change="generatePassword">数字</el-checkbox>
      <el-checkbox v-model="args.isContainSymbol" @change="generatePassword">符号</el-checkbox>
      <el-checkbox v-model="args.reloadAfterCopy">复制后继续生成</el-checkbox>
    </el-row>
    <el-row
        class="operate-container"
    >
      <el-input-number class="password-length" v-model="args.passwordLength" :min="1" :max="128" label="密码长度"/>
      <el-icon :size="20" class="generate-btn">
        <img :src="generateSvg" alt="Generate" @click="generatePassword"/>
      </el-icon>
      <el-button class="copy-btn" type="primary" @click="copyPassword">复制密码</el-button>
    </el-row>
    <h2 v-if="!isEmptyHistory">复制历史</h2>
    <div class="flex-container">
      <el-tag
          class="tag"
          v-for="item in args.copyHistory"
          :key="item"
          closable
          @close="deleteCopyHistory(item)"
      >{{ item }}
      </el-tag>
    </div>
    <el-icon v-if="!isEmptyHistory" :size="25" style="cursor:pointer;">
      <Delete @click="removeAllHistory"/>
    </el-icon>
  </div>
</template>

<style scoped lang="scss">
#random-password {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background-image: linear-gradient(to right, #43e97b 0%, #38f9d7 100%);

  .password {
    font-size: 24px;
    font-weight: bold;
    margin: 20px;
    text-align: center;
  }

  .operate-container {
    width: fit-content;
    display: flex;
    justify-content: space-evenly;
    align-items: center;
    margin: 4px;

    .password-length {
      margin: 20px;
    }
  }

  .generate-btn {
    cursor: pointer;
    margin: 20px;
  }

  @keyframes rotate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  .generate-btn.rotate {
    animation: rotate .5s linear;
  }

  .copy-btn {
    margin: 20px;
  }

  .flex-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    margin: 20px;

    .tag {
      margin: 4px;
    }
  }
}
</style>
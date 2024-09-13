<script setup lang="ts">
import {computed, onMounted, ref, watch} from "vue";
import generateSvg from "/src/assets/generate.svg";
import {ElMessage} from "element-plus";

const passwordLength = ref(parseInt(localStorage.getItem('passwordLength') || '16'));
const isContainLowercase = ref(true);
const isContainUppercase = ref(true);
const isContainNumber = ref(true);
const isContainSymbol = ref(false);
const password = ref('');
const lowercase = 'abcdefghijklmnopqrstuvwxyz';
const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const number = '0123456789';
const symbol = '!@#$%^&*()_+-=[]{}|;:,.<>?';
const containArr = computed(() => {
  const arr = [];
  if (isContainLowercase.value) {
    arr.push(lowercase);
  }
  if (isContainUppercase.value) {
    arr.push(uppercase);
  }
  if (isContainNumber.value) {
    arr.push(number);
  }
  if (isContainSymbol.value) {
    arr.push(symbol);
  }
  return arr;
});
const copyHistory = ref<string[]>([]);

const generatePassword = () => {
  let str = '';
  const arr = containArr.value;
  if (arr.length === 0) {
    password.value = '';
    ElMessage.error('至少选择一种字符');
    return;
  }
  for (let i = 0; i < passwordLength.value; i++) {
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
  const input = document.createElement('input');
  input.value = password.value;
  document.body.appendChild(input);
  input.select();
  document.execCommand('copy');
  document.body.removeChild(input);
  // 保存复制历史
  const copyHistoryStr = localStorage.getItem('copyHistory');
  if (copyHistoryStr) {
    const copyHistoryArr = JSON.parse(copyHistoryStr);
    copyHistoryArr.push(password.value);
    localStorage.setItem('copyHistory', JSON.stringify(copyHistoryArr));
  } else {
    localStorage.setItem('copyHistory', JSON.stringify([password.value]));
  }
  copyHistory.value.push(password.value);
  ElMessage.success('复制成功');
}

watch([
      passwordLength,
      isContainLowercase,
      isContainUppercase,
      isContainNumber,
      isContainSymbol
    ],
    generatePassword
);

watch(passwordLength, (newVal) => {
  // 保存到本地存储
  localStorage.setItem('passwordLength', newVal.toString());
});

const loadCopyHistory = () => {
  const copyHistoryStr = localStorage.getItem('copyHistory');
  if (copyHistoryStr) {
    copyHistory.value = JSON.parse(copyHistoryStr);
  }
}

const deleteCopyHistory = (item: string) => {
  const copyHistoryStr = localStorage.getItem('copyHistory');
  if (copyHistoryStr) {
    const copyHistoryArr = JSON.parse(copyHistoryStr);
    const index = copyHistoryArr.indexOf(item);
    copyHistoryArr.splice(index, 1);
    localStorage.setItem('copyHistory', JSON.stringify(copyHistoryArr));
    copyHistory.value = copyHistoryArr;
  }
}

onMounted(() => {
  generatePassword();
  loadCopyHistory();
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
      <el-checkbox v-model="isContainLowercase">小写字母</el-checkbox>
      <el-checkbox v-model="isContainUppercase">大写字母</el-checkbox>
      <el-checkbox v-model="isContainNumber">数字</el-checkbox>
      <el-checkbox v-model="isContainSymbol">符号</el-checkbox>
    </el-row>
    <el-row
        class="operate-container"
    >
      <el-input-number class="password-length" v-model="passwordLength" :min="1" :max="128" label="密码长度"/>
      <el-icon :size="20" class="generate-btn">
        <img :src="generateSvg" alt="Generate" @click="generatePassword"/>
      </el-icon>
      <el-button class="copy-btn" type="primary" @click="copyPassword">复制密码</el-button>
    </el-row>
    <h2 v-if="copyHistory.length > 0">复制历史</h2>
    <el-row v-for="item in copyHistory">
      <el-tag
          :key="item"
          closable
          @close="deleteCopyHistory(item)"
      >{{ item }}
      </el-tag>
    </el-row>
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
}
</style>
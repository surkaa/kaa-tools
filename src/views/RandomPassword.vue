<script setup lang="ts">
import {computed, onMounted, reactive, ref, watch} from "vue";
import generateSvg from "/src/assets/generate.svg";
import {ElMessage} from "element-plus";
import {Delete} from '@element-plus/icons-vue';
// TODO 使用列表记录复制历史 并记录复制时间

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
  <div id="random-password" class="tool-page">
    <header class="tool-header">
      <span class="tool-eyebrow">Security utility</span>
      <h1 class="tool-title">随机密码</h1>
      <p class="tool-description">自定义字符类型和长度，快速生成适合不同场景的随机密码。</p>
    </header>

    <main class="password-workspace">
      <section class="password-display">
        <div class="result-meta">
          <span class="result-label">GENERATED PASSWORD</span>
          <span class="strength-pill">{{ args.passwordLength }} 位</span>
        </div>
        <div class="password">{{ password || '请选择至少一种字符' }}</div>
        <div class="result-actions">
          <span>每次生成都会使用新的随机组合</span>
          <el-button class="copy-btn" type="primary" @click="copyPassword">复制密码</el-button>
        </div>
      </section>

      <section class="settings-card surface-card">
        <div class="section-heading">
          <div>
            <span class="section-number">01</span>
            <h2>生成规则</h2>
          </div>
          <span>选择密码中需要包含的内容</span>
        </div>

        <div class="checkbox-grid">
          <el-checkbox v-model="args.isContainLowercase" @change="generatePassword">小写字母 <small>a–z</small></el-checkbox>
          <el-checkbox v-model="args.isContainUppercase" @change="generatePassword">大写字母 <small>A–Z</small></el-checkbox>
          <el-checkbox v-model="args.isContainNumber" @change="generatePassword">数字 <small>0–9</small></el-checkbox>
          <el-checkbox v-model="args.isContainSymbol" @change="generatePassword">特殊符号 <small>!@#</small></el-checkbox>
        </div>

        <div class="operate-container">
          <div class="length-control">
            <label>密码长度</label>
            <el-input-number class="password-length" v-model="args.passwordLength" :min="1" :max="128" label="密码长度"/>
          </div>
          <el-checkbox v-model="args.reloadAfterCopy">复制后自动生成新密码</el-checkbox>
          <button class="generate-control" type="button" title="重新生成" @click="generatePassword">
            <el-icon :size="19" class="generate-btn">
              <img :src="generateSvg" alt="重新生成"/>
            </el-icon>
            重新生成
          </button>
        </div>
      </section>

      <section v-if="!isEmptyHistory" class="history-card surface-card">
        <div class="section-heading history-heading">
          <div>
            <span class="section-number">02</span>
            <h2>复制历史</h2>
          </div>
          <button class="clear-history" type="button" @click="removeAllHistory">
            <el-icon :size="16"><Delete/></el-icon>
            清空
          </button>
        </div>
        <div class="flex-container">
          <el-tag
              v-for="item in args.copyHistory"
              :key="item"
              class="tag"
              closable
              @close="deleteCopyHistory(item)"
          >{{ item }}</el-tag>
        </div>
      </section>
    </main>
  </div>
</template>

<style scoped lang="scss">
#random-password {
  width: 100%;
}

.password-workspace {
  width: min(100%, 960px);
  display: grid;
  gap: 18px;
  margin: 0 auto;
}

.password-display {
  position: relative;
  padding: clamp(24px, 4vw, 42px);
  overflow: hidden;
  border-radius: 28px;
  color: #eefbf6;
  background:
      radial-gradient(circle at 84% 18%, rgba(82, 226, 176, 0.2), transparent 16rem),
      linear-gradient(135deg, #173f34, #0a211b);
  box-shadow: 0 24px 65px rgba(17, 53, 43, 0.2);

  &::after {
    position: absolute;
    top: -80px;
    right: -40px;
    width: 220px;
    height: 220px;
    border: 1px solid rgba(112, 231, 192, 0.14);
    border-radius: 50%;
    content: "";
  }
}

.result-meta,
.result-actions {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.result-label {
  color: rgba(220, 244, 236, 0.48);
  font-size: 0.64rem;
  font-weight: 750;
  letter-spacing: 0.16em;
}

.strength-pill {
  padding: 6px 10px;
  border: 1px solid rgba(115, 229, 192, 0.14);
  border-radius: 999px;
  color: #72e1bc;
  background: rgba(76, 213, 168, 0.08);
  font-size: 0.68rem;
}

.password {
  position: relative;
  z-index: 1;
  margin: 34px 0;
  overflow-wrap: anywhere;
  color: #fff;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: clamp(1.4rem, 3.2vw, 2.65rem);
  font-weight: 650;
  letter-spacing: 0.035em;
  line-height: 1.35;
}

.result-actions {
  color: rgba(220, 244, 236, 0.48);
  font-size: 0.72rem;
}

.copy-btn {
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #092c22;
  background: #61ddb5;
  box-shadow: 0 10px 30px rgba(42, 205, 151, 0.2);
}

.settings-card,
.history-card {
  padding: clamp(22px, 4vw, 36px);
}

.section-heading {
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
    color: var(--muted);
    font-size: 0.72rem;
  }
}

.section-number {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  color: var(--accent-strong);
  background: var(--accent-soft);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.64rem;
}

.checkbox-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

:deep(.checkbox-grid .el-checkbox) {
  width: 100%;
  height: 58px;
  margin: 0;
  padding: 0 15px;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: #f8fbfa;
}

:deep(.checkbox-grid .el-checkbox.is-checked) {
  border-color: rgba(17, 168, 121, 0.3);
  background: var(--accent-soft);
}

:deep(.el-checkbox__label) {
  font-weight: 600;
}

:deep(.el-checkbox__label small) {
  display: block;
  margin-top: 2px;
  color: #98a49f;
  font-size: 0.6rem;
  font-weight: 500;
}

.operate-container {
  display: flex;
  align-items: end;
  gap: 24px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

.length-control {
  display: grid;
  gap: 7px;

  label {
    color: #52615d;
    font-size: 0.72rem;
    font-weight: 650;
  }
}

:deep(.password-length) {
  width: 150px;
  min-height: 44px;
}

.generate-control,
.clear-history {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  margin-left: auto;
  padding: 0 16px;
  border: 1px solid var(--line);
  border-radius: 11px;
  color: #31443f;
  background: #f7faf9;
  cursor: pointer;
  font-size: 0.76rem;
  font-weight: 650;
  transition: border-color 0.2s ease, transform 0.2s ease;

  &:hover {
    border-color: rgba(17, 168, 121, 0.35);
    transform: translateY(-1px);
  }
}

.generate-btn img {
  width: 19px;
  height: 19px;
  display: block;
}

@keyframes rotate {
  to { transform: rotate(360deg); }
}

.generate-btn.rotate {
  animation: rotate .5s linear;
}

.history-heading {
  margin-bottom: 16px;
}

.clear-history {
  min-height: 36px;
  margin-left: 0;
  padding-inline: 12px;
  color: #a34e4e;
  background: #fff7f7;
}

.flex-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

:deep(.tag) {
  height: auto;
  padding: 8px 11px;
  border-color: var(--line);
  border-radius: 10px;
  color: #315047;
  background: #f5faf8;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
}

@media (max-width: 760px) {
  .checkbox-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .operate-container {
    align-items: flex-start;
    flex-wrap: wrap;
  }
}

@media (max-width: 520px) {
  .password-display,
  .settings-card,
  .history-card {
    border-radius: 22px;
  }

  .result-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .copy-btn {
    width: 100%;
  }

  .section-heading > span {
    display: none;
  }

  .checkbox-grid {
    grid-template-columns: 1fr;
  }

  .operate-container {
    flex-direction: column;
  }

  .length-control,
  :deep(.password-length),
  .generate-control {
    width: 100%;
  }

  .generate-control {
    margin-left: 0;
  }
}
</style>

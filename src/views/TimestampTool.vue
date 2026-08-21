<script setup lang="ts">
// 转换时间戳为日期
import {onMounted, onUnmounted, reactive, ref} from "vue";
import {CopyDocument, EditPen} from '@element-plus/icons-vue';
import {ElMessage} from "element-plus";
import dayjs from "dayjs";

enum ReloadType {
  InputSecondsTimestamp,
  InputMillisecondsTimestamp,
  InputDate,
}

let intervalId: number;

const formData = reactive({
  secondTimestamp: '',
  millisecondTimestamp: '',
  date: ''
});

const cardRowGutter = 10;
const cardColSpan = 20;
const cardColBtnSpan = 4;
const stopLive = ref(false);

// region 时间戳转换方法
// 转换时间戳为日期
function secondTimestampToDate(timestamp: number): string {
  const date = dayjs(timestamp * 1000);
  return date.format('YYYY-MM-DD HH:mm:ss');
}

// 转换时间戳为日期
function millisecondTimestampToDate(timestamp: number): string {
  const date = dayjs(timestamp);
  return date.format('YYYY-MM-DD HH:mm:ss');
}

// 转换日期为时间戳
function dateToSecondTimestamp(dateString: string): number {
  const date = dayjs(dateString);
  return date.unix();
}

// 转换日期为时间戳
function dateToMillisecondTimestamp(dateString: string): number {
  const date = dayjs(dateString);
  return date.valueOf();
}

// 秒级别转换为毫秒级别
function secondToMillisecond(second: number): number {
  return second * 1000;
}

// 毫秒级别转换为秒级别 直接取整
function millisecondToSecond(millisecond: number): number {
  return Math.floor(millisecond / 1000);
}

// endregion

const convertTimestamp = (type: ReloadType) => {
  // 清除form.millisecondTimestamp和form.secondTimestamp中含有非数字的内容 含有的话置空 然后退出函数 不进行转换
  // oninput="value=value.replace(/[^\d.]/g,'')" 也能做到 当时@input会失效

  if (formData.millisecondTimestamp && !/^\d+$/.test(formData.millisecondTimestamp)) {
    formData.millisecondTimestamp = '';
    ElMessage.error('毫秒别时间戳只能输入数字');
    return;
  }
  if (formData.secondTimestamp && !/^\d+$/.test(formData.secondTimestamp)) {
    formData.secondTimestamp = '';
    ElMessage.error('秒别时间戳只能输入数字');
    return;
  }
  // 日期格式检查 2021-08-01 12:00:00
  if (formData.date && !dayjs(formData.date).isValid()) {
    formData.date = '';
    ElMessage.error('日期格式错误');
    return;
  }

  switch (type) {
    case ReloadType.InputSecondsTimestamp:
      formData.millisecondTimestamp = formData.secondTimestamp ? secondToMillisecond(Number(formData.secondTimestamp)).toString() : '';
      formData.date = formData.secondTimestamp ? secondTimestampToDate(Number(formData.secondTimestamp)) : '';
      break;
    case ReloadType.InputMillisecondsTimestamp:
      formData.secondTimestamp = formData.millisecondTimestamp ? millisecondToSecond(Number(formData.millisecondTimestamp)).toString() : '';
      formData.date = formData.millisecondTimestamp ? millisecondTimestampToDate(Number(formData.millisecondTimestamp)) : '';
      break;
    case ReloadType.InputDate:
      formData.secondTimestamp = formData.date ? dateToSecondTimestamp(formData.date).toString() : '';
      formData.millisecondTimestamp = formData.date ? dateToMillisecondTimestamp(formData.date).toString() : '';
      break;
  }
}

const pasteTimestamp = (type: ReloadType) => {
  navigator.clipboard.readText().then(text => {
    console.log(type, 'pasteTimestamp', text)
    switch (type) {
      case ReloadType.InputSecondsTimestamp:
        formData.secondTimestamp = text;
        break;
      case ReloadType.InputMillisecondsTimestamp:
        formData.millisecondTimestamp = text;
        break;
      case ReloadType.InputDate:
        formData.date = text;
        break;
    }
    convertTimestamp(type);
  });
}

// region 实时时间
const timer = ref(dayjs().valueOf());
// 设置格式化时间 YYYY-MM-DD HH:mm:ss
const formattedTime = ref(
    dayjs(timer.value).format('YYYY-MM-DD HH:mm:ss')
);

const updateTimestamp = () => {
  if (stopLive.value) {
    return;
  }
  timer.value = dayjs().valueOf();
  formattedTime.value = dayjs(timer.value).format('YYYY-MM-DD HH:mm:ss');
};

const copyTimestampToClipboard = () => {
  let text = timer.value.toString();
  navigator.clipboard.writeText(text);
  ElMessage.success('已复制: ' + text);
};

const copyFormattedTimeToClipboard = () => {
  let text = formattedTime.value;
  navigator.clipboard.writeText(text);
  ElMessage.success('已复制: ' + text);
};

onMounted(() => {
  intervalId = window.setInterval(updateTimestamp, 1);
});

onUnmounted(() => {
  clearInterval(intervalId);
});
// endregion
</script>

<template>
  <div id="timestamp-tool" class="tool-page">
    <header class="tool-header">
      <span class="tool-eyebrow">Time utility</span>
      <h1 class="tool-title">时间戳转换</h1>
      <p class="tool-description">在秒级时间戳、毫秒级时间戳与常用日期格式之间即时互转。</p>
    </header>

    <section class="converter-card surface-card">
      <div class="card-intro">
        <div>
          <span class="section-index">01</span>
          <h2>格式转换</h2>
        </div>
        <span class="instant-badge">输入后即时更新</span>
      </div>

      <el-form class="form" :model="formData" label-position="top">
        <div class="convert-fields">
          <el-row :gutter="cardRowGutter">
            <el-col :span="cardColSpan">
              <el-form-item label="秒级时间戳">
                <el-input
                    v-model="formData.secondTimestamp"
                    placeholder="例如：1724211120"
                    @input="convertTimestamp(ReloadType.InputSecondsTimestamp)"
                />
              </el-form-item>
            </el-col>
            <el-col :span="cardColBtnSpan">
              <el-button
                  class="icon-button paste-button"
                  title="粘贴剪贴板中的秒级时间戳"
                  @click="pasteTimestamp(ReloadType.InputSecondsTimestamp)"
              >
                <el-icon><EditPen/></el-icon>
              </el-button>
            </el-col>
          </el-row>

          <el-row :gutter="cardRowGutter">
            <el-col :span="cardColSpan">
              <el-form-item label="毫秒级时间戳">
                <el-input
                    v-model="formData.millisecondTimestamp"
                    placeholder="例如：1724211120000"
                    @input="convertTimestamp(ReloadType.InputMillisecondsTimestamp)"
                />
              </el-form-item>
            </el-col>
            <el-col :span="cardColBtnSpan">
              <el-button
                  class="icon-button paste-button"
                  title="粘贴剪贴板中的毫秒级时间戳"
                  @click="pasteTimestamp(ReloadType.InputMillisecondsTimestamp)"
              >
                <el-icon><EditPen/></el-icon>
              </el-button>
            </el-col>
          </el-row>

          <el-row :gutter="cardRowGutter">
            <el-col :span="cardColSpan">
              <el-form-item label="日期与时间">
                <el-input
                    v-model="formData.date"
                    placeholder="YYYY-MM-DD HH:mm:ss"
                    @input="convertTimestamp(ReloadType.InputDate)"
                />
              </el-form-item>
            </el-col>
            <el-col :span="cardColBtnSpan">
              <el-button
                  class="icon-button paste-button"
                  title="粘贴剪贴板中的日期"
                  @click="pasteTimestamp(ReloadType.InputDate)"
              >
                <el-icon><EditPen/></el-icon>
              </el-button>
            </el-col>
          </el-row>
        </div>

        <div class="live-panel">
          <div class="live-heading">
            <div>
              <span class="section-index">02</span>
              <h2>当前时间</h2>
            </div>
            <span class="live-state" :class="{'is-paused': stopLive}">
              <i></i>{{ stopLive ? '已暂停' : '实时更新' }}
            </span>
          </div>

          <el-row :gutter="cardRowGutter">
            <el-col :span="cardColSpan">
              <el-form-item label="当前毫秒级时间戳">
                <div class="current-timestamp">
                  <span>{{ timer }}</span>
                  <el-button
                      link
                      title="点击暂停或继续"
                      class="current-timestamp-btn"
                      @click="stopLive = !stopLive"
                  >
                    <div :class="{'resume': stopLive, 'stop': !stopLive}" class="stopLiveIcon"/>
                  </el-button>
                </div>
              </el-form-item>
            </el-col>
            <el-col :span="cardColBtnSpan">
              <el-button class="icon-button" title="复制当前毫秒级时间戳" @click="copyTimestampToClipboard()">
                <el-icon><CopyDocument/></el-icon>
              </el-button>
            </el-col>
          </el-row>

          <el-row :gutter="cardRowGutter">
            <el-col :span="cardColSpan">
              <el-form-item label="当前日期与时间">
                <div class="formatted-time">{{ formattedTime }}</div>
              </el-form-item>
            </el-col>
            <el-col :span="cardColBtnSpan">
              <el-button class="icon-button" title="复制当前时间" @click="copyFormattedTimeToClipboard()">
                <el-icon><CopyDocument/></el-icon>
              </el-button>
            </el-col>
          </el-row>
        </div>
      </el-form>
    </section>
  </div>
</template>

<style scoped lang="scss">
#timestamp-tool {
  width: 100%;
}

.converter-card {
  width: min(100%, 920px);
  margin: 0 auto;
  padding: clamp(22px, 4vw, 42px);
}

.card-intro,
.live-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  > div {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  h2 {
    margin: 0;
    font-size: 1.08rem;
    letter-spacing: -0.02em;
  }
}

.section-index {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  color: var(--accent-strong);
  background: var(--accent-soft);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.66rem;
  font-weight: 700;
}

.instant-badge,
.live-state {
  padding: 6px 10px;
  border-radius: 999px;
  color: var(--muted);
  background: var(--surface-soft);
  font-size: 0.7rem;
}

.form {
  margin-top: 28px;
}

.convert-fields {
  display: grid;
  gap: 4px;
}

:deep(.el-row) {
  align-items: end;
}

:deep(.el-form-item) {
  margin-bottom: 16px;
}

:deep(.el-form-item__label) {
  padding-bottom: 7px;
  color: #52615d;
  font-size: 0.76rem;
  font-weight: 650;
}

:deep(.el-input__wrapper) {
  min-height: 48px;
  padding-inline: 15px;
}

.icon-button {
  width: 44px;
  height: 48px;
  margin-bottom: 16px;
  padding: 0;
  border-color: var(--line);
  color: var(--accent-strong);
  background: #f6faf8;
}

.live-panel {
  margin-top: 16px;
  padding-top: 28px;
  border-top: 1px solid var(--line);
}

.live-heading {
  margin-bottom: 24px;
}

.live-state {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: #137657;
  background: #e6f8f1;

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #21b787;
    box-shadow: 0 0 0 4px rgba(33, 183, 135, 0.12);
  }

  &.is-paused {
    color: #9b6d19;
    background: #fff5df;

    i {
      background: #dfa538;
      box-shadow: 0 0 0 4px rgba(223, 165, 56, 0.12);
    }
  }
}

.current-timestamp,
.formatted-time {
  width: 100%;
  min-height: 48px;
  display: flex;
  align-items: center;
  padding: 0 15px;
  border: 1px solid var(--line);
  border-radius: 12px;
  color: #1d3c34;
  background: #f5f9f7;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.9rem;
}

.current-timestamp-btn {
  min-height: auto;
  margin-left: auto;
  padding: 6px;
}

.stopLiveIcon {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.stop { background: #e65f5f; }

.resume {
  width: 0;
  height: 0;
  border-top: 6px solid transparent;
  border-bottom: 6px solid transparent;
  border-left: 10px solid #21a979;
  border-radius: 0;
}

@media (max-width: 560px) {
  .converter-card {
    padding: 22px 18px;
    border-radius: 22px;
  }

  .instant-badge {
    display: none;
  }

  .current-timestamp,
  .formatted-time {
    padding-inline: 11px;
    font-size: 0.76rem;
  }
}
</style>

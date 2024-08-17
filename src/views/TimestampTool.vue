<script setup lang="ts">
// 转换时间戳为日期
import {onMounted, onUnmounted, reactive, ref} from "vue";
import {CopyDocument} from '@element-plus/icons-vue'

enum ReloadType {
  InputSecondsTimestamp,
  InputMillisecondsTimestamp,
  InputDate,
}

// region 时间戳转换方法
// 转换时间戳为日期
function secondTimestampToDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {hour12: false});
}

// 转换时间戳为日期
function millisecondTimestampToDate(timestamp: number): string {
  const date = new Date(timestamp / 1000);
  return date.toLocaleString('zh-CN', {hour12: false});
}

// 转换日期为时间戳
function dateToSecondTimestamp(dateString: string): number {
  const date = new Date(dateString);
  return date.getTime();
}

// 转换日期为时间戳
function dateToMillisecondTimestamp(dateString: string): number {
  const date = new Date(dateString);
  return date.getTime() * 1000;
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

const form = reactive({
  secondTimestamp: '',
  millisecondTimestamp: '',
  date: ''
});

const convertTimestamp = (type: ReloadType) => {
  // 清除form.millisecondTimestamp和form.secondTimestamp中含有非数字的内容 含有的话置空 然后退出函数 不进行转换
  // oninput="value=value.replace(/[^\d.]/g,'')" 也能做到 当时@input会失效

  if (form.millisecondTimestamp && !/^\d+$/.test(form.millisecondTimestamp)) {
    form.millisecondTimestamp = '';
    return;
  }
  if (form.secondTimestamp && !/^\d+$/.test(form.secondTimestamp)) {
    form.secondTimestamp = '';
    return;
  }

  switch (type) {
    case ReloadType.InputSecondsTimestamp:
      form.millisecondTimestamp = form.secondTimestamp ? secondToMillisecond(Number(form.secondTimestamp)).toString() : '';
      form.date = form.secondTimestamp ? secondTimestampToDate(Number(form.secondTimestamp)) : '';
      break;
    case ReloadType.InputMillisecondsTimestamp:
      form.secondTimestamp = form.millisecondTimestamp ? millisecondToSecond(Number(form.millisecondTimestamp)).toString() : '';
      form.date = form.millisecondTimestamp ? millisecondTimestampToDate(Number(form.millisecondTimestamp)) : '';
      break;
    case ReloadType.InputDate:
      form.secondTimestamp = form.date ? dateToSecondTimestamp(form.date).toString() : '';
      form.millisecondTimestamp = form.date ? dateToMillisecondTimestamp(form.date).toString() : '';
      break;
  }
}

// region 实时时间
const timer = ref(Date.now());
const formattedTime = ref(new Date(timer.value).toLocaleString());

const updateTimestamp = () => {
  timer.value = Date.now();
  formattedTime.value = new Date(timer.value).toLocaleString();
};

const copyTimestampToClipboard = () => {
  navigator.clipboard.writeText(timer.value.toString());
};

const copyFormattedTimeToClipboard = () => {
  navigator.clipboard.writeText(formattedTime.value);
};

let intervalId: number;

onMounted(() => {
  intervalId = window.setInterval(updateTimestamp, 1);
});

onUnmounted(() => {
  clearInterval(intervalId);
});
// endregion
</script>

<template>
  <div id="timestamp-tool">
    <h1 class="title">Timestamp Tool</h1>
    <el-form class="form" :model="form" label-width="auto">
      <el-form-item label="秒级别时间戳">
        <el-input
            v-model="form.secondTimestamp"
            placeholder="输入秒级别时间戳"
            @input="convertTimestamp(ReloadType.InputSecondsTimestamp)"
        />
      </el-form-item>
      <el-form-item label="毫秒别时间戳">
        <el-input
            v-model="form.millisecondTimestamp"
            placeholder="输入毫秒别时间戳"
            @input="convertTimestamp(ReloadType.InputMillisecondsTimestamp)"
        />
      </el-form-item>
      <el-form-item label="日期">
        <el-input
            v-model="form.date"
            placeholder="输入日期"
            @input="convertTimestamp(ReloadType.InputDate)"
        />
      </el-form-item>
    </el-form>
    <div class="current">
      <p>当前秒级别时间戳: {{ timer }}
        <el-button
            class="copy-button"
            @click="copyTimestampToClipboard()"
        >
          <el-icon>
            <CopyDocument/>
          </el-icon>
        </el-button>
      </p>
      <p>当前时间: {{ formattedTime }}
        <el-button
            class="copy-button"
            @click="copyFormattedTimeToClipboard()"
        >
          <el-icon>
            <CopyDocument/>
          </el-icon>
        </el-button>
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
#timestamp-tool {
  width: 100vw;
  height: 100vh;
  background-image: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);

  .title {
    text-align: center;
    font-size: 2rem;
    margin: 20px 0;
  }

  .form {
    // 占居宽度尽量小
    width: fit-content;
    margin: 0 auto;
  }

  .current {
    margin-top: 20px;
    text-align: center;

    .copy-button {
      margin-left: 10px;
    }
  }
}
</style>
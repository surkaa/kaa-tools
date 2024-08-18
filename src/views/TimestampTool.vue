<script setup lang="ts">
// 转换时间戳为日期
import {onMounted, onUnmounted, reactive, ref} from "vue";
import {CopyDocument, EditPen} from '@element-plus/icons-vue'
import {ElMessage} from "element-plus";
import dayjs from "dayjs";

enum ReloadType {
  InputSecondsTimestamp,
  InputMillisecondsTimestamp,
  InputDate,
}

let intervalId: number;

const form = reactive({
  secondTimestamp: '',
  millisecondTimestamp: '',
  date: ''
});

const cardRowGutter = 10;
const cardColSpan = 20;
const cardColBtnSpan = 4;

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

  if (form.millisecondTimestamp && !/^\d+$/.test(form.millisecondTimestamp)) {
    form.millisecondTimestamp = '';
    ElMessage.error('毫秒别时间戳只能输入数字');
    return;
  }
  if (form.secondTimestamp && !/^\d+$/.test(form.secondTimestamp)) {
    form.secondTimestamp = '';
    ElMessage.error('秒别时间戳只能输入数字');
    return;
  }
  // 日期格式检查 2021-08-01 12:00:00
  if (form.date && !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(form.date)) {
    form.date = '';
    ElMessage.error('日期格式错误');
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

const pasteTimestamp = (type: ReloadType) => {
  navigator.clipboard.readText().then(text => {
    console.log(type, 'pasteTimestamp', text)
    switch (type) {
      case ReloadType.InputSecondsTimestamp:
        form.secondTimestamp = text;
        break;
      case ReloadType.InputMillisecondsTimestamp:
        form.millisecondTimestamp = text;
        break;
      case ReloadType.InputDate:
        form.date = text;
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
  <div id="timestamp-tool">
    <h1 class="title">Timestamp Tool</h1>
    <el-form class="form" :model="form" label-width="auto">
      <el-row :gutter="cardRowGutter">
        <el-col :span="cardColSpan">
          <el-form-item label="秒级别时间戳">
            <el-input
                v-model="form.secondTimestamp"
                placeholder="输入秒级别时间戳"
                @input="convertTimestamp(ReloadType.InputSecondsTimestamp)"
            />
          </el-form-item>
        </el-col>
        <el-col :span="cardColBtnSpan">
          <el-button
              class="paste-button"
              title="粘贴剪贴板中的秒别时间戳到输入框"
              @click="pasteTimestamp(ReloadType.InputSecondsTimestamp)"
          >
            <el-icon>
              <EditPen/>
            </el-icon>
          </el-button>
        </el-col>
      </el-row>
      <el-row :gutter="cardRowGutter">
        <el-col :span="cardColSpan">
          <el-form-item label="毫秒别时间戳">
            <el-input
                v-model="form.millisecondTimestamp"
                placeholder="输入毫秒别时间戳"
                @input="convertTimestamp(ReloadType.InputMillisecondsTimestamp)"
            />
          </el-form-item>
        </el-col>
        <el-col :span="cardColBtnSpan">
          <el-button
              class="paste-button"
              title="粘贴剪贴板中的毫秒别时间戳到输入框"
              @click="pasteTimestamp(ReloadType.InputMillisecondsTimestamp)"
          >
            <el-icon>
              <EditPen/>
            </el-icon>
          </el-button>
        </el-col>
      </el-row>
      <el-row :gutter="cardRowGutter">
        <el-col :span="cardColSpan">
          <el-form-item label="日期">
            <el-input
                v-model="form.date"
                placeholder="输入日期"
                @input="convertTimestamp(ReloadType.InputDate)"
            />
          </el-form-item>
        </el-col>
        <el-col :span="cardColBtnSpan">
          <el-button
              class="paste-button"
              title="粘贴剪贴板中的日期到输入框"
              @click="pasteTimestamp(ReloadType.InputDate)"
          >
            <el-icon>
              <EditPen/>
            </el-icon>
          </el-button>
        </el-col>
      </el-row>
      <el-row :gutter="cardRowGutter">
        <el-col :span="cardColSpan">
          <el-form-item label="当前毫秒别时间戳">
            {{ timer }}
          </el-form-item>
        </el-col>
        <el-col :span="cardColBtnSpan">
          <el-button
              class="copy-button"
              title="复制当前毫秒别时间戳到剪贴板"
              @click="copyTimestampToClipboard()"
          >
            <el-icon>
              <CopyDocument/>
            </el-icon>
          </el-button>
        </el-col>
      </el-row>
      <el-row :gutter="cardRowGutter">
        <el-col :span="cardColSpan">
          <el-form-item label="当前时间">
            {{ formattedTime }}
          </el-form-item>
        </el-col>
        <el-col :span="cardColBtnSpan">
          <el-button
              class="copy-button"
              title="复制当前时间到剪贴板"
              @click="copyFormattedTimeToClipboard()"
          >
            <el-icon>
              <CopyDocument/>
            </el-icon>
          </el-button>
        </el-col>
      </el-row>
    </el-form>
  </div>
</template>

<style scoped lang="scss">
#timestamp-tool {
  width: 100vw;
  height: 100vh;
  background-image: linear-gradient(120deg, #a1c4fd 0%, #c2e9fb 100%);

  .title {
    color: #1a1a1a;
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
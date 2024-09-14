<script setup lang="ts">
import {computed, nextTick, reactive, Ref, ref, watch} from "vue";
import SelectButton from 'primevue/selectbutton';
import {useCompRef} from "../utils/useCompRef.ts";
import {ElInput} from "element-plus";

const availableTranslateApis = ['baidu', 'tencent'] as const;

const translateApiOptions = computed(
    () => availableTranslateApis
);

// 定义formData类型
interface FormData {
  translateApi: typeof availableTranslateApis[number];
  fromLanguage: 'auto' | 'zh' | 'en';
  toLanguage: 'zh' | 'en';
  appid: string;
  text: string;
  result: string;
}

const formData = reactive<FormData>({
  translateApi: 'baidu',
  fromLanguage: 'auto',
  toLanguage: 'zh',
  appid: '',
  text: '',
  result: ''
});

const translate = () => {
  console.log('translate');
  console.log(formData);
  formData.result = 'result';
};
</script>

<template>
  <div id="translate">
    <h1 class="title">Translate Tool</h1>
    <div class="content">
      <div class="translate-api">
        <SelectButton
            class="translate-api-select-button"
            v-model="formData.translateApi"
            :options="translateApiOptions"
        />
      </div>
      <div class="translate-form">
        <div class="left">
          <div class="from-language">
            <SelectButton
                v-model="formData.fromLanguage"
                :options="['auto', 'zh', 'en']"
            />
            <el-input
                class="appid"
                v-model="formData.appid"
                type="password"
                placeholder="appid"
                clearable
            />
          </div>
          <div class="text">
            <el-input
                class="text-input"
                @input="translate"
                v-model="formData.text"
                type="textarea"
                clearable
                placeholder="text"
            />
          </div>
        </div>
        <div class="right">
          <div class="to-language">
            <SelectButton
                v-model="formData.toLanguage"
                :options="['zh', 'en']"
            />
          </div>
          <div class="result">
            <el-input
                v-model="formData.result"
                class="text-input"
                type="textarea"
                placeholder="result"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
#translate {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-image: linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%);

  .title {
    margin: 1rem auto;
  }

  .content {
    margin: 2rem auto;

    .translate-api {
      display: flex;

      .translate-api-select-button {
        margin: 0 auto;
      }
    }

    .translate-form {
      display: flex;
      margin-top: 1rem;

      .left {
        display: flex;
        flex-direction: column;
        margin-right: 1rem;
        width: fit-content;

        .from-language {
          margin-bottom: 1rem;
          display: flex;

          .appid {
            margin: auto 1rem;
          }
        }

        .to-language {
          margin-bottom: 1rem;
        }

        .appid {
          margin-bottom: 1rem;
        }

        .text {
          margin-bottom: 1rem;

          .text-input {
            width: 100%;
            font-size: 1.4rem;

            ::v-deep(textarea) {
              border-radius: 10px;
            }
          }
        }
      }

      .right {
        display: flex;
        flex-direction: column;
        margin-left: 1rem;

        .to-language {
          margin-bottom: 1rem;
        }

        .result {
          margin-bottom: 1rem;

          .text-input {
            width: 100%;
            font-size: 1.4rem;

            ::v-deep(textarea) {
              border-radius: 10px;
            }
          }
        }
      }
    }
  }
}
</style>
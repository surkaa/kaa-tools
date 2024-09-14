<script setup lang="ts">

</script>

<template>
  <div id="json-formatter">
    <h1 class="title">Json Formatter</h1>
    <div class="column"></div>
  </div>
</template>

<style scoped lang="scss">
#json-formatter {
  width: 100vw;
  height: 100vh;
  background-image: linear-gradient(120deg, #a6c0fe 0%, #f68084 100%);

  .column {
    width: 38%;
    height: 38%;
    position: fixed;
    top: 100%;
    background-color: #f6808455;
    border-radius: 8px;
    box-shadow: 0 0 10px  0 rgba(0, 0, 0, 0.2), 0 0 10px 10px rgba(0, 0, 0, 0.1);
    // 旋转54度
    transform-origin: left top;
    transform: rotate(-54deg);
  }
}
</style>
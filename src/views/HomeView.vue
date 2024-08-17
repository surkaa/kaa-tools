<script setup lang="ts">

</script>

<template>
  <div id="home">
    <h1 class="title">Home</h1>
    <p class="description">
      一个简单工具库
    </p>
  </div>
</template>

<style scoped lang="scss">
#home {
  width: 100vw;
  height: 100vh;
  background-image: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;

  .description {
    font-size: 1.5rem;
    text-align: center;
    color: #E0E0E0;
    margin: auto 0;
    user-select: none;
  }
}
</style>
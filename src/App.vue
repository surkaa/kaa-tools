<template>
  <div id="main">
    <router-view/>
    <nav id="toolbar">
      <router-link to="/timestamp-tool">时间戳转换</router-link>
      <router-link to="/json-formatter">JSON格式化</router-link>
    </nav>
  </div>
</template>

<style scoped lang="scss">
#main {
  display: flex;
  flex-direction: column;

  #toolbar {
    position: absolute;
    display: flex;
    bottom: 4px;
    left: 50%;
    transform: translateX(-50%); // 水平居中对齐
    width: auto;
    justify-content: space-around;
    background-color: #333;
    padding: 10px 0;
    border-radius: 20px;

    a {
      color: #fff;
      text-decoration: none;
      font-weight: bold;
      margin: 2px 4rem;
    }
  }
}
</style>

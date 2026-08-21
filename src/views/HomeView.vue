<script setup lang="ts">
const tools = [
  {to: '/timestamp', index: '01', title: '时间戳转换', description: '时间、秒与毫秒之间快速互转', accent: 'mint'},
  {to: '/cut-pdf', index: '02', title: 'PDF 裁剪', description: '预览页面并导出所需部分', accent: 'blue'},
  {to: '/password', index: '03', title: '随机密码', description: '按规则生成并管理复制记录', accent: 'violet'},
  {to: '/github-repostory-file-tree', index: '04', title: '仓库文件树', description: '读取 GitHub 仓库的完整目录', accent: 'orange'},
  {to: '/comparison-marker', index: '05', title: '对比标记', description: '制作适合展示的多图对比结果', accent: 'rose'},
  {to: '/image-compare', index: '06', title: '图片对比', description: '并排查看并高亮像素差异', accent: 'cyan'},
  {to: '/references-tools', index: '07', title: '参考文献工具', description: '将 BibTeX 转为规范引用格式', accent: 'lime'},
];
</script>

<template>
  <div id="home">
    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">KAA TOOLS</span>
        <h1>工具箱</h1>
        <p>一些常用的小工具。</p>
      </div>
      <div class="tool-count">
        <strong>{{ tools.length }}</strong>
        <span>个工具</span>
      </div>
    </section>

    <section class="tool-section">
      <div class="section-heading">
        <h2>全部工具</h2>
      </div>

      <div class="tool-grid">
        <router-link
            v-for="tool in tools"
            :key="tool.to"
            :to="tool.to"
            class="tool-card"
            :class="`accent-${tool.accent}`"
        >
          <div class="card-top">
            <span class="tool-index">{{ tool.index }}</span>
            <span class="tool-arrow">↗</span>
          </div>
          <h3>{{ tool.title }}</h3>
          <p>{{ tool.description }}</p>
        </router-link>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
#home {
  width: 100%;
  min-height: 100%;
  padding: clamp(28px, 5vw, 64px);
}

.hero {
  width: min(100%, 1180px);
  min-height: 230px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin: 0 auto 48px;
  padding: clamp(32px, 5vw, 58px);
  border-radius: 30px;
  color: #f6fffb;
  background: linear-gradient(135deg, #173f34, #0b211b);
  box-shadow: 0 28px 76px rgba(25, 68, 56, 0.18);
}

.eyebrow {
  color: #6fe0bb;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.18em;
}

h1 {
  margin: 18px 0 10px;
  font-size: clamp(2.8rem, 6vw, 5rem);
  font-weight: 740;
  letter-spacing: -0.07em;
  line-height: 1;
}

.hero-copy p {
  margin: 0;
  color: rgba(225, 243, 237, 0.62);
  font-size: 0.94rem;
}

.tool-count {
  min-width: 92px;
  display: grid;
  gap: 2px;
  padding: 17px 20px;
  border: 1px solid rgba(115, 229, 192, 0.14);
  border-radius: 16px;
  background: rgba(95, 226, 183, 0.07);

  strong {
    color: #7ee5c3;
    font-size: 1.7rem;
    line-height: 1;
  }

  span {
    color: rgba(225, 243, 237, 0.46);
    font-size: 0.65rem;
  }
}

.tool-section {
  width: min(100%, 1180px);
  margin: 0 auto;
}

.section-heading {
  margin-bottom: 18px;

  h2 {
    margin: 0;
    color: var(--ink);
    font-size: clamp(1.5rem, 3vw, 2rem);
    letter-spacing: -0.04em;
  }
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.tool-card {
  --card-accent: #2ac495;
  min-height: 170px;
  display: flex;
  flex-direction: column;
  padding: 22px;
  border: 1px solid var(--line);
  border-radius: 20px;
  color: var(--ink);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: 0 10px 30px rgba(26, 62, 53, 0.05);
  text-decoration: none;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;

  &:hover {
    border-color: color-mix(in srgb, var(--card-accent) 32%, transparent);
    box-shadow: 0 18px 44px rgba(26, 62, 53, 0.1);
    transform: translateY(-4px);

    .tool-arrow {
      color: #fff;
      background: var(--card-accent);
    }
  }

  h3 {
    margin: auto 0 7px;
    font-size: 1.02rem;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0;
    color: var(--muted);
    font-size: 0.75rem;
    line-height: 1.55;
  }
}

.accent-blue { --card-accent: #4988e8; }
.accent-violet { --card-accent: #8a68da; }
.accent-orange { --card-accent: #e59947; }
.accent-rose { --card-accent: #dd6f84; }
.accent-cyan { --card-accent: #34aeca; }
.accent-lime { --card-accent: #78ad4d; }

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tool-index {
  color: var(--card-accent);
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 0.66rem;
  font-weight: 700;
}

.tool-arrow {
  width: 29px;
  height: 29px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #7a8985;
  background: #edf3f0;
  font-size: 0.78rem;
  transition: color 0.2s ease, background 0.2s ease;
}

@media (max-width: 1040px) {
  .tool-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  #home {
    padding: 18px 16px 104px;
  }

  .hero {
    min-height: 220px;
    align-items: flex-start;
    flex-direction: column;
    margin-bottom: 36px;
    padding: 32px 26px;
  }

  .tool-count {
    min-width: 0;
    display: flex;
    align-items: baseline;
    gap: 5px;
    padding: 10px 13px;

    strong {
      font-size: 1.1rem;
    }
  }

  .tool-grid {
    grid-template-columns: 1fr;
  }

  .tool-card {
    min-height: 155px;
  }
}
</style>

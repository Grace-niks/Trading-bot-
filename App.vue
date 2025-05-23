
<template>
  <div class="p-6 font-sans">
    <h1 class="text-2xl font-bold mb-4">📊 XRP Volume Bot Dashboard</h1>
    <div v-if="loading">Loading...</div>
    <div v-else>
      <p class="mb-2">Last trade: {{ lastTrade?.time }} | Type: {{ lastTrade?.type?.toUpperCase() }} | Amount: {{ lastTrade?.amount }}</p>
      <ul class="list-disc ml-6">
        <li>Total Trades: {{ stats.trades.length }}</li>
        <li>Total Swaps: {{ stats.swaps }}</li>
        <li>Errors: {{ stats.errors }}</li>
      </ul>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      stats: { trades: [], errors: 0, swaps: 0 },
      loading: true
    };
  },
  computed: {
    lastTrade() {
      return this.stats.trades[this.stats.trades.length - 1] || {};
    }
  },
  methods: {
    async fetchStats() {
      try {
        const res = await fetch('http://localhost:3000/status');
        const data = await res.json();
        this.stats = data;
        this.loading = false;
      } catch (err) {
        console.error('Failed to load stats', err);
        this.loading = true;
      }
    }
  },
  mounted() {
    this.fetchStats();
    setInterval(this.fetchStats, 4000);
  }
};
</script>

<style scoped>
body {
  background-color: #f8fafc;
}
</style>

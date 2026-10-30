<script setup lang="ts">
import { ref } from 'vue';
import { vOverlayScrollbar } from './vOverlayScrollbar';

const count = ref(30);
const keepShowing = ref(false);
</script>

<template>
  <div class="demo">
    <div class="controls">
      <button type="button" @click="count += 10">Add 10 items</button>
      <button type="button" @click="count = Math.max(0, count - 10)">Remove 10 items</button>
      <label><input v-model="keepShowing" type="checkbox" /> Keep the bars showing</label>
      <span class="count">{{ count }} items</span>
    </div>
    <div v-overlay-scrollbar="{ autoHide: !keepShowing }" class="list">
      <div class="row">This first row is wide enough to scroll sideways as well, so both bars show</div>
      <div v-for="n in count" :key="n" class="row">Item {{ n }}</div>
    </div>
  </div>
</template>

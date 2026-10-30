<script lang="ts">
  import { overlayScrollbar } from './overlayScrollbar';

  let count = $state(30);
  let keepShowing = $state(false);
</script>

<div class="demo">
  <div class="controls">
    <button type="button" onclick={() => (count += 10)}>Add 10 items</button>
    <button type="button" onclick={() => (count = Math.max(0, count - 10))}>Remove 10 items</button>
    <label><input type="checkbox" bind:checked={keepShowing} /> Keep the bars showing</label>
    <span class="count">{count} items</span>
  </div>
  <div class="list" use:overlayScrollbar={{ autoHide: !keepShowing }}>
    <div class="row">This first row is wide enough to scroll sideways as well, so both bars show</div>
    {#each { length: count }, i}
      <div class="row">Item {i + 1}</div>
    {/each}
  </div>
</div>

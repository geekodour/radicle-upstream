<script lang="typescript">
  // Wrapper for expanding/dismissing overlays

  import { createEventDispatcher } from "svelte";

  import { close, current, open } from "../../src/overlay";

  export let expanded: boolean;
  export let style: string = "";

  let container: HTMLDivElement;

  const dispatch = createEventDispatcher();

  const handleClick = (ev: MouseEvent) => {
    const component = $current;
    const inside = component && component.contains(ev.target as HTMLDivElement);
    if (!inside) close();
  };

  $: if (expanded) open(container);
  $: if ($current !== container) dispatch("hide");
</script>

<svelte:window on:click={handleClick} />

<div bind:this={container} {style}>
  <slot />
</div>

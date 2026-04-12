<script lang="ts">
  import { page } from '$app/stores';
  import ReviewScreen from '../review.svelte';

  $: recordingId = $page.params.id;
</script>

<ReviewScreen {recordingId} />

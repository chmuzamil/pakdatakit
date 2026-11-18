---
title: Install for Vue
description: Install pakdatakit-vue for composables and a v-pak-input directive that format as you type.
---

```bash
npm install pakdatakit-vue pakdatakit
```

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { vPakInput } from 'pakdatakit-vue';
const cnic = ref('');
</script>

<template>
  <input v-model="cnic" v-pak-input:cnic />
</template>
```

There are also `useCnic`, `usePhone` and `useIban` composables, and checkout and KYC forms. Vue 3.3+.

Package: [npm](https://www.npmjs.com/package/pakdatakit-vue)

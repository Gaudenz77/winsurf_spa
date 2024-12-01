<template>
  <div class="hero min-h-[80vh] bg-base-200">
    <div class="hero-content text-center">
      <div class="max-w-md">
        <h1 class="text-5xl font-bold">Welcome to Winsurf SPA</h1>
        <p class="py-6">A modern task management application built with Vue 3 and DaisyUI. Get started by creating an account or signing in.</p>
        <button class="btn btn-primary" @click="$emit('start')">Get Started</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['start'])
</script>

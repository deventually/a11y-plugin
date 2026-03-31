<template>
  <div>
    <h1>User Profile</h1>
    <h2>Edit your information</h2>

    <form @submit.prevent="save">
      <div class="field">
        <label for="name">Full name</label>
        <input id="name" v-model="name" type="text" autocomplete="name" required aria-required="true">
      </div>

      <div class="field">
        <label for="email">Email address</label>
        <input id="email" v-model="email" type="email" autocomplete="email" required aria-required="true">
      </div>

      <div class="field">
        <label for="country">Country</label>
        <select id="country" v-model="country" autocomplete="country-name">
          <option value="">Select country</option>
          <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
        </select>
      </div>

      <div v-if="error" role="alert" aria-live="assertive" class="error">
        <svg aria-hidden="true" viewBox="0 0 20 20"><path d="M10 0a10 10 0 100 20 10 10 0 000-20z"/></svg>
        {{ error }}
      </div>

      <button type="submit">Save Changes</button>
    </form>

    <button aria-label="Settings" @click="toggleSettings" class="icon-only">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94"/></svg>
    </button>

    <dialog ref="confirmDialog" aria-labelledby="dialog-title">
      <h2 id="dialog-title">Confirm changes</h2>
      <p>Are you sure you want to save?</p>
      <div class="dialog-actions">
        <button @click="confirm">Yes, save</button>
        <button @click="cancel">Cancel</button>
      </div>
    </dialog>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'

const name = ref('')
const email = ref('')
const country = ref('')
const error = ref('')
const confirmDialog = ref(null)
const countries = ['US', 'UK', 'NL', 'DE']
let triggerElement = null

function save() {
  triggerElement = document.activeElement
  confirmDialog.value.showModal()
}

function confirm() {
  confirmDialog.value.close()
  nextTick(() => triggerElement?.focus())
}

function cancel() {
  confirmDialog.value.close()
  nextTick(() => triggerElement?.focus())
}

function toggleSettings() {
  // settings panel logic
}
</script>

<template>
  <div>
    <h1>User Profile</h1>
    <h3>Edit your information</h3>

    <form @submit.prevent="save">
      <input v-model="name" placeholder="Full name">
      <input v-model="email" type="email" placeholder="Email address">

      <select v-model="country">
        <option value="">Select country</option>
        <option v-for="c in countries" :key="c" :value="c">{{ c }}</option>
      </select>

      <div class="error" v-if="error" style="color: red;">
        {{ error }}
      </div>

      <div @click="save" class="btn">Save Changes</div>
    </form>

    <div @click="toggleSettings" class="icon-only">
      <svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94"/></svg>
    </div>

    <dialog ref="confirmDialog">
      <p>Are you sure you want to save?</p>
      <button @click="confirm">Yes</button>
      <button @click="cancel">No</button>
    </dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const name = ref('')
const email = ref('')
const country = ref('')
const error = ref('')
const confirmDialog = ref(null)
const countries = ['US', 'UK', 'NL', 'DE']

function save() {
  confirmDialog.value.showModal()
}

function confirm() {
  confirmDialog.value.close()
}

function cancel() {
  confirmDialog.value.close()
}

function toggleSettings() {
  // no keyboard handler
}
</script>

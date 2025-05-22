<script setup>
import Multiselect from 'vue-multiselect'
import { ref } from 'vue'

const value = ref([{ title: 'Explorer', desc: 'Discovering new species!', img: 'assets/posters/creatures.png' }])
const options = ref([
    { title: 'Space Pirate', desc: 'More space battles!', img: 'assets/posters/fleet.png' },
    { title: 'Merchant', desc: 'PROFIT!', img: 'assets/posters/trading_post.png' },
    { title: 'Explorer', desc: 'Discovering new species!', img: 'assets/posters/creatures.png' },
    { title: 'Miner', desc: 'We need to go deeper!', img: 'assets/posters/resource_lab.png' }
])

const customLabel = ({ title, desc }) => {
    return `${title} – ${desc}`
}

const addTag = (newTag) => {
    const tag = {
        title: newTag,
        desc: 'New tag',
        img: 'assets/posters/default.png'
    }
    options.value.push(tag)
    value.value.push(tag)
}
</script>

<template>
    <div>
        <label class="typo__label">Tagging</label>
        <multiselect id="tagging" v-model="value" tag-placeholder="Add this as new tag"
            placeholder="Search or add a tag" label="title" track-by="title" :options="options" :multiple="true"
            :taggable="true" @tag="addTag" :custom-label="customLabel"></multiselect>
        <pre class="language-json"><code>{{ value }}</code></pre>
    </div>
</template>

<template>
	<div class="modal" :class="[modelValue ? 'show' : '', closing ? 'closing' : '']" @animationend="removeClosing">
		<div class="modal-dialog">
			<div class="modal-content">
				<div class="modal-header">
					<h5 class="text-xl font-medium leading-normal">
						<slot name="header">{{ title }}</slot>
					</h5>
					<button class="btn-close" @click="hide">
						<i class="light-icon-x"></i>
					</button>
				</div>
				<div class="modal-body">
					<slot name="default"></slot>
				</div>
				<div class="modal-footer">
					<slot name="footer" :show="show" :hide="hide"></slot>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = defineProps<{
	title?: string;
	modelValue?: boolean;
}>();

const emit = defineEmits(["update:modelValue"]);

const closing = ref(false);

const show = () => {
	emit("update:modelValue", true);
};
const hide = () => {
	closing.value = true;
	emit("update:modelValue", false);
};

const removeClosing = () => {
	closing.value = false;
};

defineExpose({ show, hide });
</script>

<style scoped>
@keyframes fade-in {
	0% {
		opacity: 0;
	}
	100% {
		opacity: 1;
	}
}

@keyframes fade-out {
	0% {
		opacity: 1;
	}
	100% {
		opacity: 0;
	}
}

.modal {
	@apply fixed top-0 left-0 hidden w-full h-full outline-none overflow-x-hidden overflow-y-auto bg-black bg-opacity-60 z-50;
}
.modal.closing {
	@apply block;
	animation: fade-out 150ms ease-in-out 1 forwards;
}
.modal.show {
	@apply block;
	animation: fade-in 200ms ease-in-out 1 forwards;
}
.modal-dialog {
	@apply flex items-center my-7 mx-auto relative w-auto pointer-events-none;
	max-width: 500px;
	height: calc(100% - 3.5rem);
	min-height: calc(100% - 3.5rem);
}
.modal.show .modal-dialog {
	transform: none;
}
.modal-content {
	@apply shadow-lg relative flex flex-col w-full pointer-events-auto bg-clip-padding rounded-md outline-none border border-tachikoma-200 text-gray-200;
}
.modal-content {
	@apply max-h-full overflow-hidden overflow-y-auto;
}
.btn-close {
	@apply box-content w-6 h-6 p-1 border-none rounded-none opacity-50 focus:shadow-none focus:outline-none focus:opacity-100 text-red-200 hover:text-white hover:opacity-75 hover:no-underline;
}
.modal-header {
	@apply flex flex-shrink-0 items-center justify-between p-4 border-b border-tachikoma-200 bg-tachikoma-700 rounded-t-md;
}
.modal-body {
	@apply relative p-4 bg-tachikoma-600;
}
.modal-footer {
	@apply flex flex-shrink-0 flex-wrap items-center justify-end p-4 border-t border-tachikoma-200 bg-tachikoma-700 rounded-b-md;
}
</style>

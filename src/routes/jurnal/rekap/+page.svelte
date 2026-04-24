<script lang="ts">
	import { api, type Journal } from '$lib/api';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth.svelte';

	let journals = $state<Journal[]>([]);
	let currentPage = $state(1);
	let loading = $state(true);
	let selected = $state<Journal | null>(null);

	$effect(() => {
		auth.init();
		if (!auth.isLoggedIn) { goto('/'); }
	});

	let initialized = false;
	$effect(() => {
		if (!auth.isLoggedIn || initialized) return;
		initialized = true;
		loadJournals();
	});

	async function loadJournals() {
		loading = true;
		try {
			const res = await api.journals.list(currentPage);
			journals = res.data;
			if (!selected && res.data.length > 0) {
				selected = await api.journals.get(res.data[0].id);
			}
		} finally { loading = false; }
	}

	async function openDetail(id: string) {
		selected = await api.journals.get(id);
	}

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
	}
	function formatShortDate(d: string) {
		return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
	}
	function formatLongDate(d: string) {
		return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
	}
</script>

<!-- Mobile -->
<div class="lg:hidden p-4 space-y-4">
	{#if selected}
		<div class="flex items-center gap-2">
			<button onclick={() => (selected = null)} class="flex items-center gap-1.5 text-[#1F4E79] text-sm font-medium">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
				Kembali
			</button>
		</div>
		{@render detailCard(selected)}
	{:else}
		{@render listView()}
	{/if}
</div>

<!-- Desktop: always two-column -->
<div class="hidden lg:grid grid-cols-5 gap-6">
	<!-- Left: journal list -->
	<div class="col-span-2">
		<div class="flex items-center justify-between mb-4">
			<div>
				<p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Riwayat</p>
				<p class="text-lg font-bold text-gray-900">Jurnal Saya</p>
			</div>
			<span class="text-xs text-gray-400 bg-white border border-gray-200 px-2.5 py-1 rounded-full font-medium shadow-sm">
				{journals.length} entri
			</span>
		</div>

		{#if loading}
			<div class="space-y-2">
				{#each [1,2,3,4] as _}
					<div class="bg-white rounded-2xl h-20 animate-pulse border border-gray-100"></div>
				{/each}
			</div>
		{:else if journals.length === 0}
			<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
				<p class="text-sm font-semibold text-gray-600">Belum ada jurnal</p>
				<a href="/jurnal" class="inline-flex items-center gap-1 bg-[#1F4E79] text-white text-sm font-semibold px-4 py-2 rounded-xl mt-3">Isi Jurnal Pertama</a>
			</div>
		{:else}
			<div class="space-y-2">
				{#each journals as j}
					<button onclick={() => openDetail(j.id)}
						class="w-full bg-white rounded-2xl border-2 shadow-sm p-4 text-left flex items-center gap-3 transition-all
							{selected?.id === j.id ? 'border-[#1F4E79] shadow-md' : 'border-gray-100 hover:border-[#1F4E79]/30 hover:shadow-md'}">
						<div class="shrink-0 w-12 h-12 bg-blue-50 rounded-xl flex flex-col items-center justify-center">
							<span class="text-xs font-bold text-[#1F4E79] leading-none">{formatShortDate(j.date).split('/')[0]}</span>
							<span class="text-xs text-[#1F4E79]/60 leading-none mt-0.5">/{formatShortDate(j.date).split('/')[1]}</span>
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-semibold text-gray-900 truncate">{j.title}</p>
							<div class="flex items-center gap-1.5 mt-1">
								{#if j.aiProcessed}
									<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">AI</span>
								{:else}
									<span class="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">Draft</span>
								{/if}
								{#if j.feedbacks && j.feedbacks.length > 0}
									<span class="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">{j.feedbacks.length} feedback</span>
								{/if}
							</div>
						</div>
						<svg class="w-4 h-4 shrink-0 {selected?.id === j.id ? 'text-[#1F4E79]' : 'text-gray-200'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
						</svg>
					</button>
				{/each}
			</div>

			<div class="flex items-center justify-center gap-4 pt-3">
				<button onclick={() => { currentPage = Math.max(1, currentPage - 1); loadJournals(); }} disabled={currentPage === 1}
					class="flex items-center gap-1 text-sm font-medium text-[#1F4E79] disabled:text-gray-300">
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
					Prev
				</button>
				<span class="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Hal {currentPage}</span>
				<button onclick={() => { currentPage += 1; loadJournals(); }} disabled={journals.length < 10}
					class="flex items-center gap-1 text-sm font-medium text-[#1F4E79] disabled:text-gray-300">
					Next
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
				</button>
			</div>
		{/if}
	</div>

	<!-- Right: detail panel -->
	<div class="col-span-3">
		{#if selected}
			{@render detailCard(selected)}
		{:else if !loading}
			<div class="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center gap-3">
				<div class="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
					<svg class="w-7 h-7 text-[#1F4E79]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
					</svg>
				</div>
				<p class="text-sm text-gray-400">Pilih jurnal untuk melihat detail</p>
			</div>
		{/if}
	</div>
</div>

{#snippet listView()}
	<div class="flex items-center justify-between">
		<div>
			<p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Riwayat</p>
			<p class="text-base font-bold text-gray-800">Jurnal Saya</p>
		</div>
		<span class="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">{journals.length} entri</span>
	</div>

	{#if loading}
		<div class="space-y-2">
			{#each [1,2,3,4] as _}<div class="bg-white rounded-2xl h-20 animate-pulse border border-gray-100"></div>{/each}
		</div>
	{:else if journals.length === 0}
		<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
			<div class="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
				<svg class="w-7 h-7 text-[#1F4E79]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
				</svg>
			</div>
			<p class="text-sm font-semibold text-gray-600">Belum ada jurnal</p>
			<p class="text-xs text-gray-400 mt-1 mb-4">Mulai isi jurnal harian PKL Anda</p>
			<a href="/jurnal" class="inline-flex items-center gap-1 bg-[#1F4E79] text-white text-sm font-semibold px-4 py-2 rounded-xl">Isi Jurnal Pertama</a>
		</div>
	{:else}
		<div class="space-y-2">
			{#each journals as j}
				<button onclick={() => openDetail(j.id)}
					class="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-left flex items-center gap-3 hover:border-[#1F4E79]/30 hover:shadow-md transition-all">
					<div class="shrink-0 w-12 h-12 bg-blue-50 rounded-xl flex flex-col items-center justify-center">
						<span class="text-xs font-bold text-[#1F4E79] leading-none">{formatShortDate(j.date).split('/')[0]}</span>
						<span class="text-xs text-[#1F4E79]/60 leading-none mt-0.5">/{formatShortDate(j.date).split('/')[1]}</span>
					</div>
					<div class="flex-1 min-w-0">
						<p class="text-sm font-semibold text-gray-900 truncate">{j.title}</p>
						<div class="flex items-center gap-1.5 mt-1">
							{#if j.aiProcessed}
								<span class="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">AI</span>
							{:else}
								<span class="text-xs bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-medium">Draft</span>
							{/if}
						</div>
					</div>
					<svg class="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
				</button>
			{/each}
		</div>
		<div class="flex items-center justify-center gap-4 pt-2">
			<button onclick={() => { currentPage = Math.max(1, currentPage - 1); loadJournals(); }} disabled={currentPage === 1}
				class="flex items-center gap-1 text-sm font-medium text-[#1F4E79] disabled:text-gray-300">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>Prev
			</button>
			<span class="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Hal {currentPage}</span>
			<button onclick={() => { currentPage += 1; loadJournals(); }} disabled={journals.length < 10}
				class="flex items-center gap-1 text-sm font-medium text-[#1F4E79] disabled:text-gray-300">
				Next<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
			</button>
		</div>
	{/if}
{/snippet}

{#snippet detailCard(j: Journal)}
	<div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
		<div class="bg-gradient-to-r from-[#1F4E79] to-blue-500 px-4 lg:px-6 py-4">
			<p class="text-white font-bold text-sm lg:text-base">{j.title}</p>
			<p class="text-blue-200 text-xs mt-0.5">{formatLongDate(j.date)}</p>
		</div>

		<div class="p-4 lg:p-6 space-y-3 text-sm text-gray-700">
			{#if j.activityCompiled}
				<div class="bg-blue-50 rounded-xl p-3 lg:p-4">
					<p class="text-xs font-bold text-[#1F4E79] uppercase tracking-wide mb-1.5">Uraian Kegiatan</p>
					<p class="leading-relaxed">{j.activityCompiled}</p>
				</div>
				{#if j.newThings}
					<div>
						<p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Hal Baru Dipelajari</p>
						<p>{j.newThings}</p>
					</div>
				{/if}
				{#if j.obstacle}
					<div>
						<p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Kendala</p>
						<p>{j.obstacle}</p>
					</div>
				{/if}
				{#if j.solution}
					<div>
						<p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Solusi</p>
						<p>{j.solution}</p>
					</div>
				{/if}
				{#if j.rtl}
					<div>
						<p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Rencana Tindak Lanjut</p>
						<p>{j.rtl}</p>
					</div>
				{/if}
			{:else}
				<div class="bg-amber-50 rounded-xl p-3">
					<p class="text-xs font-bold text-amber-600 uppercase tracking-wide mb-1.5">Catatan Asli</p>
					<p class="leading-relaxed text-gray-700">{j.activityRaw}</p>
				</div>
				<p class="text-xs text-gray-400 italic text-center">Jurnal ini belum dikompilasi AI</p>
			{/if}

			{#if j.feedbacks && j.feedbacks.length > 0}
				<div class="pt-3 border-t border-gray-100 space-y-2">
					<p class="text-xs font-bold text-gray-500 uppercase tracking-wide">Feedback</p>
					{#each j.feedbacks as fb}
						<div class="bg-blue-50 rounded-xl p-3">
							<p class="text-xs font-semibold text-[#1F4E79] capitalize mb-1">{fb.reviewerRole}</p>
							<p class="text-sm text-gray-700">{fb.content}</p>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
{/snippet}

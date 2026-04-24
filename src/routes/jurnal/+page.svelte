<script lang="ts">
	import { api, type Journal } from '$lib/api';
	import { auth } from '$lib/auth.svelte';

	let date = $state(new Date().toISOString().split('T')[0]);
	let title = $state('');
	let activityRaw = $state('');
	let loading = $state(false);
	let compiling = $state(false);
	let error = $state('');
	let success = $state('');
	let aiPreview = $state<Journal | null>(null);
	let showPreview = $state(false);
	let recording = $state(false);
	let recognition: any = null;

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
	}

	function toggleVoice() {
		if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
			alert('Browser tidak mendukung input suara.');
			return;
		}
		if (recording) { recognition?.stop(); recording = false; return; }
		const SR = (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
		recognition = new SR();
		recognition.lang = 'id-ID';
		recognition.continuous = true;
		recognition.interimResults = false;
		recognition.onresult = (e: SpeechRecognitionEvent) => {
			const transcript = Array.from(e.results).map((r) => r[0].transcript).join(' ');
			activityRaw += (activityRaw ? ' ' : '') + transcript;
		};
		recognition.onend = () => { recording = false; };
		recognition.start();
		recording = true;
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = ''; success = ''; loading = true;
		try {
			const journal = await api.journals.create({ date, title, activityRaw });
			aiPreview = journal;
			showPreview = !!journal.activityCompiled;
			if (!showPreview) { success = 'Jurnal berhasil disimpan!'; title = ''; activityRaw = ''; }
		} catch (err) {
			error = (err as Error).message;
		} finally { loading = false; }
	}

	async function recompile() {
		if (!aiPreview) return;
		compiling = true;
		try { aiPreview = await api.journals.compile(aiPreview.id); }
		finally { compiling = false; }
	}

	function acceptAI() {
		success = 'Jurnal berhasil disimpan!';
		showPreview = false; aiPreview = null; title = ''; activityRaw = '';
	}
</script>

<!-- Mobile -->
<div class="lg:hidden p-4 space-y-4">
	<div class="flex items-center justify-between">
		<div>
			<p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Jurnal Harian</p>
			<p class="text-base font-bold text-gray-800">{formatDate(date).split(',')[0]}, {new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
		</div>
		<input type="date" bind:value={date}
			class="text-xs text-[#1F4E79] border border-[#1F4E79]/30 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 bg-blue-50"/>
	</div>

	{@render alerts()}
	{#if showPreview && aiPreview}
		{@render aiPanel()}
	{:else}
		{@render form()}
	{/if}
</div>

<!-- Desktop -->
<div class="hidden lg:block space-y-6">
	<!-- Date + status bar -->
	<div class="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
		<div>
			<p class="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Tanggal Jurnal</p>
			<p class="text-lg font-bold text-gray-900">{formatDate(date)}</p>
		</div>
		<input type="date" bind:value={date}
			class="text-sm text-[#1F4E79] border border-[#1F4E79]/30 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 bg-blue-50 font-medium"/>
	</div>

	{@render alerts()}

	<div class="grid grid-cols-2 gap-6">
		<!-- Left: form (always visible on desktop) -->
		<div>
			<p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Input Jurnal</p>
			{@render form()}
		</div>

		<!-- Right: AI preview or placeholder -->
		<div>
			<p class="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Hasil Kompilasi AI</p>
			{#if showPreview && aiPreview}
				{@render aiPanel()}
			{:else}
				<div class="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center h-full flex flex-col items-center justify-center gap-3">
					<div class="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
						<svg class="w-7 h-7 text-[#1F4E79]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
						</svg>
					</div>
					<div>
						<p class="text-sm font-semibold text-gray-500">AI siap mengkompilasi</p>
						<p class="text-xs text-gray-400 mt-1">Isi form jurnal dan simpan —<br/>hasil AI akan muncul di sini</p>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

{#snippet alerts()}
	{#if success && !showPreview}
		<div class="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3">
			<svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>
			{success}
		</div>
	{/if}
	{#if error}
		<div class="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
			<svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
			{error}
		</div>
	{/if}
{/snippet}

{#snippet form()}
	<form onsubmit={handleSubmit} class="space-y-4">
		<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 lg:p-5 space-y-4">
			<div>
				<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5" for="title">Judul / Tema Pekerjaan</label>
				<input id="title" type="text" bind:value={title} required
					class="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79] bg-gray-50"
					placeholder="Mis: Inspeksi kualitas part YMMA"/>
			</div>

			<div>
				<div class="flex items-center justify-between mb-1.5">
					<label class="text-xs font-bold text-gray-500 uppercase tracking-wide" for="activity">Uraian Kegiatan</label>
					<button type="button" onclick={toggleVoice}
						class="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold border transition-all
							{recording ? 'bg-red-500 text-white border-red-500 shadow-md' : 'text-[#1F4E79] border-[#1F4E79]/30 bg-blue-50 hover:bg-blue-100'}">
						<svg class="w-3.5 h-3.5 {recording ? 'animate-pulse' : ''}" fill="currentColor" viewBox="0 0 20 20">
							<path fill-rule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clip-rule="evenodd"/>
						</svg>
						{recording ? 'Stop' : 'Suara'}
					</button>
				</div>
				<textarea id="activity" bind:value={activityRaw} required rows={6}
					class="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79] resize-none bg-gray-50"
					placeholder="Ceritakan kegiatan hari ini dengan bahasa santai, AI akan merapikannya menjadi jurnal formal..."></textarea>
				{#if recording}
					<div class="flex items-center gap-2 mt-2">
						<span class="inline-flex gap-0.5">
							<span class="w-1 h-3 bg-red-500 rounded-full animate-bounce" style="animation-delay:0ms"></span>
							<span class="w-1 h-3 bg-red-500 rounded-full animate-bounce" style="animation-delay:150ms"></span>
							<span class="w-1 h-3 bg-red-500 rounded-full animate-bounce" style="animation-delay:300ms"></span>
						</span>
						<p class="text-xs text-red-500 font-medium">Sedang merekam suara...</p>
					</div>
				{/if}
			</div>

			<div>
				<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
					Foto Dokumentasi <span class="text-gray-300 font-normal normal-case">(opsional)</span>
				</label>
				<label class="flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:border-[#1F4E79]/40 hover:bg-blue-50/30 transition-colors">
					<svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
					</svg>
					<span class="text-sm text-gray-400">Pilih foto dokumentasi...</span>
					<input type="file" accept="image/*" class="hidden"/>
				</label>
			</div>
		</div>

		<button type="submit" disabled={loading}
			class="w-full bg-[#1F4E79] text-white font-bold rounded-xl py-4 text-sm hover:bg-[#163d5e] disabled:opacity-60 transition-colors shadow-md flex items-center justify-center gap-2">
			{#if loading}
				<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
				</svg>
				Menyimpan & Mengompilasi AI...
			{:else}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
				</svg>
				SIMPAN JURNAL
			{/if}
		</button>
	</form>
{/snippet}

{#snippet aiPanel()}
	<div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
		<div class="bg-gradient-to-r from-[#1F4E79] to-blue-500 px-4 py-3 flex items-center gap-2">
			<div class="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
				<svg class="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
					<path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
				</svg>
			</div>
			<span class="text-white text-sm font-bold">Hasil Kompilasi AI</span>
			<span class="ml-auto text-xs bg-white/20 text-white px-2 py-0.5 rounded-full">Gemini</span>
		</div>

		<div class="p-4 space-y-3 text-sm text-gray-700">
			{#if aiPreview?.activityCompiled}
				<div class="bg-blue-50 rounded-xl p-3">
					<p class="text-xs font-bold text-[#1F4E79] uppercase tracking-wide mb-1.5">Uraian Kegiatan</p>
					<p class="leading-relaxed text-gray-700">{aiPreview.activityCompiled}</p>
				</div>
			{/if}
			{#if aiPreview?.newThings}
				<div>
					<p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Hal Baru Dipelajari</p>
					<p>{aiPreview.newThings}</p>
				</div>
			{/if}
			{#if aiPreview?.obstacle}
				<div>
					<p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Kendala</p>
					<p>{aiPreview.obstacle}</p>
				</div>
			{/if}
			{#if aiPreview?.solution}
				<div>
					<p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Solusi</p>
					<p>{aiPreview.solution}</p>
				</div>
			{/if}
			{#if aiPreview?.rtl}
				<div>
					<p class="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Rencana Tindak Lanjut</p>
					<p>{aiPreview.rtl}</p>
				</div>
			{/if}
		</div>

		<div class="px-4 pb-4 flex gap-2">
			<button onclick={recompile} disabled={compiling}
				class="flex-1 flex items-center justify-center gap-1.5 border-2 border-[#1F4E79] text-[#1F4E79] text-sm font-semibold py-2.5 rounded-xl hover:bg-blue-50 disabled:opacity-60 transition-colors">
				<svg class="w-4 h-4 {compiling ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
				</svg>
				{compiling ? 'Mengompilasi...' : 'Kompilasi Ulang'}
			</button>
			<button onclick={acceptAI}
				class="flex-1 bg-[#1F4E79] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#163d5e] transition-colors">
				Pakai Hasil Ini
			</button>
		</div>
	</div>
{/snippet}

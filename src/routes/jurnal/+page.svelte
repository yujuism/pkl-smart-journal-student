<script lang="ts">
	import { api, type Journal } from '$lib/api';
	import { auth } from '$lib/auth.svelte';
	import { goto } from '$app/navigation';

	// ── State ────────────────────────────────────────────────────────────────
	let date = $state(new Date().toISOString().split('T')[0]);
	let tab = $state<'ai' | 'manual'>('ai');

	// Tab AI
	let title = $state('');
	let activityRaw = $state('');
	let loading = $state(false);
	let compiling = $state(false);
	let error = $state('');
	let recording = $state(false);
	let recognition: any = null;

	// Desktop preview panel
	let aiPreview = $state<Journal | null>(null);
	let activityRawAtCompile = $state('');
	const isDirty = $derived(aiPreview !== null && activityRaw !== activityRawAtCompile);

	let deleting = $state(false);
	let existingJournalId = $state<string | null>(null);

	// Tab Manual
	let manualTitle = $state('');
	let manualActivity = $state('');
	let manualNewThings = $state('');
	let manualObstacle = $state('');
	let manualSolution = $state('');
	let manualRtl = $state('');
	let manualSaving = $state(false);

	// ── Helpers ──────────────────────────────────────────────────────────────
	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
	}

	// ── Voice ─────────────────────────────────────────────────────────────────
	function toggleVoice() {
		if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
			alert('Browser tidak mendukung input suara.'); return;
		}
		if (recording) { recognition?.stop(); recording = false; return; }
		const SR = (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
		recognition = new SR();
		recognition.lang = 'id-ID';
		recognition.continuous = true;
		recognition.interimResults = false;
		let lastIdx = 0;
		recognition.onresult = (e: SpeechRecognitionEvent) => {
			for (let i = lastIdx; i < e.results.length; i++) {
				if (e.results[i].isFinal) {
					activityRaw += (activityRaw ? ' ' : '') + e.results[i][0].transcript.trim();
				}
			}
			lastIdx = e.results.length;
		};
		recognition.onend = () => { recording = false; };
		recognition.start();
		recording = true;
	}

	// ── Tab AI: submit & compile ──────────────────────────────────────────────
	const isMobile = () => window.innerWidth < 1024;

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = ''; loading = true; existingJournalId = null;
		try {
			const journal = await api.journals.create({ date, title: title || undefined, activityRaw });
			if (isMobile()) {
				// Mobile: finalize langsung karena tidak ada tombol Selesai
				try { await api.journals.finalize(journal.id); } catch {}
				goto('/jurnal/rekap');
			} else {
				// Desktop: tampilkan di panel kanan
				aiPreview = journal;
				activityRawAtCompile = activityRaw;
			}
		} catch (err) {
			const msg = (err as Error).message;
			error = msg;
			if (msg.toLowerCase().includes('unique') || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('already')) {
				const found = await api.journals.getByDate(date).catch(() => null);
				if (found) existingJournalId = found.id;
			}
		} finally { loading = false; }
	}

	async function recompile() {
		if (!aiPreview) return;
		compiling = true; error = '';
		try {
			if (isDirty) await api.journals.update(aiPreview.id, { activityRaw } as Partial<Journal>);
			aiPreview = await api.journals.compile(aiPreview.id);
			activityRawAtCompile = activityRaw;
		} catch (err) {
			error = (err as Error).message;
		} finally { compiling = false; }
	}

	async function finalizeAndGo() {
		if (!aiPreview) { goto('/jurnal/rekap'); return; }
		try { await api.journals.finalize(aiPreview.id); } catch {}
		goto('/jurnal/rekap');
	}

	// Saat keluar/tutup tab tanpa klik Selesai — kirim finalize (best effort)
	// Backend cron juga akan auto-finalize setelah 5 menit
	$effect(() => {
		function handleUnload() {
			if (aiPreview?.id && !aiPreview.finalizedAt) {
				navigator.sendBeacon(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3000'}/api/journals/${aiPreview.id}/finalize`);
			}
		}
		window.addEventListener('beforeunload', handleUnload);
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') handleUnload();
		});
		return () => {
			window.removeEventListener('beforeunload', handleUnload);
		};
	});

	async function deleteToday() {
		if (!existingJournalId) return;
		if (!confirm('Hapus jurnal tanggal ini? Aksi tidak bisa dibatalkan.')) return;
		deleting = true;
		try {
			await api.journals.delete(existingJournalId);
			error = ''; existingJournalId = null;
		} catch (err) {
			error = (err as Error).message;
		} finally { deleting = false; }
	}

	// ── Tab Manual: submit ────────────────────────────────────────────────────
	async function handleManualSubmit(e: SubmitEvent) {
		e.preventDefault();
		error = ''; manualSaving = true;
		try {
			const journal = await api.journals.create({
				date,
				title: manualTitle || undefined,
				activityRaw: manualActivity,
			});
			await api.journals.update(journal.id, {
				activityCompiled: manualActivity,
				newThings: manualNewThings || undefined,
				obstacle: manualObstacle || undefined,
				solution: manualSolution || undefined,
				rtl: manualRtl || undefined,
			});
			goto('/jurnal/rekap');
		} catch (err) {
			error = (err as Error).message;
		} finally { manualSaving = false; }
	}
</script>

<!-- ══════════════════ MOBILE ══════════════════ -->
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
	{@render tabBar()}

	{#if tab === 'ai'}
		{@render aiForm()}
	{:else}
		{@render manualForm()}
	{/if}
</div>

<!-- ══════════════════ DESKTOP ══════════════════ -->
<div class="hidden lg:block space-y-6">
	<div class="flex items-center justify-between bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4">
		<div>
			<p class="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Tanggal Jurnal</p>
			<p class="text-lg font-bold text-gray-900">{formatDate(date)}</p>
		</div>
		<input type="date" bind:value={date}
			class="text-sm text-[#1F4E79] border border-[#1F4E79]/30 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 bg-blue-50 font-medium"/>
	</div>

	{@render alerts()}
	{@render tabBar()}

	{#if tab === 'ai'}
		<div class="grid grid-cols-2 gap-6">
			<div>{@render aiForm()}</div>
			<div>
				{#if aiPreview}
					{@render aiPanel()}
				{:else}
					<div class="bg-white rounded-2xl border border-dashed border-gray-200 p-10 h-full flex flex-col items-center justify-center gap-3 text-center">
						<div class="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center">
							<svg class="w-7 h-7 text-[#1F4E79]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
							</svg>
						</div>
						<p class="text-sm font-semibold text-gray-500">Hasil AI muncul di sini</p>
						<p class="text-xs text-gray-400">Isi cerita lalu simpan</p>
					</div>
				{/if}
			</div>
		</div>
	{:else}
		{@render manualForm()}
	{/if}
</div>

<!-- ══════════════════ SNIPPETS ══════════════════ -->

{#snippet alerts()}
	{#if error}
		<div class="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
			<svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
			{error}
		</div>
		{#if existingJournalId}
			<button type="button" onclick={deleteToday} disabled={deleting}
				class="w-full flex items-center justify-center gap-2 border border-red-300 text-red-600 text-sm font-semibold rounded-xl py-2.5 hover:bg-red-50 disabled:opacity-60 transition-colors">
				<svg class="w-4 h-4 {deleting ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
				</svg>
				{deleting ? 'Menghapus...' : 'Hapus jurnal tanggal ini & isi ulang'}
			</button>
		{/if}
	{/if}
{/snippet}

{#snippet tabBar()}
	<div class="flex bg-gray-100 rounded-xl p-1 gap-1">
		<button type="button" onclick={() => tab = 'ai'}
			class="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all
				{tab === 'ai' ? 'bg-white text-[#1F4E79] shadow-sm' : 'text-gray-400 hover:text-gray-600'}">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
			</svg>
			Cerita + AI
		</button>
		<button type="button" onclick={() => tab = 'manual'}
			class="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all
				{tab === 'manual' ? 'bg-white text-[#1F4E79] shadow-sm' : 'text-gray-400 hover:text-gray-600'}">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
			</svg>
			Isi Manual
		</button>
	</div>
{/snippet}

{#snippet aiForm()}
	<form onsubmit={handleSubmit} class="space-y-4">
		<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 lg:p-5 space-y-4">
			<div>
				<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5" for="title">
					Judul / Tema
					<span class="text-gray-400 font-normal normal-case">&nbsp;— opsional</span>
				</label>
				<input id="title" type="text" bind:value={title}
					class="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79] bg-gray-50"
					placeholder="Kosongkan agar AI yang menentukan"/>
			</div>

			<div>
				<div class="flex items-center justify-between mb-1.5">
					<label class="text-xs font-bold text-gray-500 uppercase tracking-wide" for="activity">Ceritakan Kegiatanmu</label>
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
					placeholder="Ceritakan kegiatan hari ini pakai bahasa santai, AI yang akan rapikan jadi jurnal formal..."></textarea>
				{#if recording}
					<div class="flex items-center gap-2 mt-2">
						<span class="inline-flex gap-0.5">
							<span class="w-1 h-3 bg-red-500 rounded-full animate-bounce" style="animation-delay:0ms"></span>
							<span class="w-1 h-3 bg-red-500 rounded-full animate-bounce" style="animation-delay:150ms"></span>
							<span class="w-1 h-3 bg-red-500 rounded-full animate-bounce" style="animation-delay:300ms"></span>
						</span>
						<p class="text-xs text-red-500 font-medium">Sedang merekam...</p>
					</div>
				{/if}
			</div>

			<div>
				<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
					Foto Dokumentasi <span class="text-gray-400 font-normal normal-case">&nbsp;— opsional</span>
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
				Menyimpan & Kompilasi AI...
			{:else}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
				</svg>
				SIMPAN & KOMPILASI AI
			{/if}
		</button>
	</form>
{/snippet}

{#snippet aiPanel()}
	<div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
		<!-- Header -->
		<div class="bg-gradient-to-r from-[#1F4E79] to-blue-500 px-4 py-3 flex items-center gap-2">
			<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
			</svg>
			<span class="text-white text-sm font-bold">Hasil Kompilasi AI</span>
		</div>

		<div class="p-4 space-y-3 text-sm text-gray-700">
			<!-- Judul -->
			{#if aiPreview?.title}
				<div class="flex items-start gap-2">
					<span class="text-xs font-bold text-gray-400 uppercase tracking-wide shrink-0 mt-0.5 w-10">Judul</span>
					<p class="font-semibold text-gray-800">{aiPreview.title}</p>
				</div>
			{/if}

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

		<!-- Hint kalau cerita diubah -->
		{#if isDirty}
			<div class="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
				<svg class="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
				Ceritamu berubah — kompilasi ulang untuk hasil terbaru
			</div>
		{/if}

		<div class="px-4 pb-4 flex gap-2">
			{#if isDirty}
				<button onclick={recompile} disabled={compiling}
					class="flex-1 flex items-center justify-center gap-1.5 text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-60 bg-amber-500 text-white hover:bg-amber-600">
					<svg class="w-4 h-4 {compiling ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
					</svg>
					{compiling ? 'Mengompilasi...' : 'Kompilasi Ulang!'}
				</button>
			{/if}
			<button onclick={finalizeAndGo}
				class="flex-1 bg-[#1F4E79] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#163d5e] transition-colors">
				Selesai ✓
			</button>
		</div>
	</div>
{/snippet}

{#snippet manualForm()}
	<form onsubmit={handleManualSubmit} class="space-y-4">
		<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 lg:p-5 space-y-4">
			<p class="text-xs text-gray-400">Isi semua kolom jurnal secara manual tanpa bantuan AI.</p>

			<div>
				<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5" for="m-title">Judul / Tema Kegiatan <span class="text-red-400">*</span></label>
				<input id="m-title" type="text" bind:value={manualTitle} required
					class="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 bg-gray-50"
					placeholder="Judul kegiatan hari ini"/>
			</div>
			<div>
				<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5" for="m-activity">Uraian Kegiatan <span class="text-red-400">*</span></label>
				<textarea id="m-activity" bind:value={manualActivity} required rows={4}
					class="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 resize-none bg-gray-50"
					placeholder="Deskripsi kegiatan hari ini..."></textarea>
			</div>
			<div>
				<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5" for="m-new">Hal Baru Dipelajari</label>
				<textarea id="m-new" bind:value={manualNewThings} rows={2}
					class="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 resize-none bg-gray-50"
					placeholder="Apa yang kamu pelajari hari ini?"></textarea>
			</div>
			<div>
				<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5" for="m-obstacle">Kendala</label>
				<textarea id="m-obstacle" bind:value={manualObstacle} rows={2}
					class="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 resize-none bg-gray-50"
					placeholder="Kendala yang dihadapi hari ini..."></textarea>
			</div>
			<div>
				<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5" for="m-solution">Solusi</label>
				<textarea id="m-solution" bind:value={manualSolution} rows={2}
					class="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 resize-none bg-gray-50"
					placeholder="Cara mengatasi kendala tersebut..."></textarea>
			</div>
			<div>
				<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5" for="m-rtl">Rencana Tindak Lanjut</label>
				<textarea id="m-rtl" bind:value={manualRtl} rows={2}
					class="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 resize-none bg-gray-50"
					placeholder="Rencana kegiatan besok..."></textarea>
			</div>
		</div>

		<button type="submit" disabled={manualSaving}
			class="w-full bg-[#1F4E79] text-white font-bold rounded-xl py-4 text-sm hover:bg-[#163d5e] disabled:opacity-60 transition-colors shadow-md flex items-center justify-center gap-2">
			{#if manualSaving}
				<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
					<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
				</svg>
				Menyimpan...
			{:else}
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/>
				</svg>
				SIMPAN JURNAL
			{/if}
		</button>
	</form>
{/snippet}

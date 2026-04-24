<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth.svelte';
	import { api, type Major } from '$lib/api';

	const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

	let nis = $state('');
	let password = $state('');
	let error = $state('');
	let loading = $state(false);

	// Onboarding state
	let showOnboarding = $state(false);
	let googleData = $state<{ email: string; name: string; picture?: string } | null>(null);
	let obName = $state('');
	let obRole = $state<'student' | 'teacher' | 'industry' | 'parent'>('student');
	let obPhone = $state('');
	let obNis = $state('');
	let obClass = $state('');
	let obMajorId = $state('');
	let majorsList = $state<Major[]>([]);
	let obSaving = $state(false);
	let obError = $state('');
	let showApprovalMessage = $state(false);

	let gInitialized = false;

	$effect(() => {
		auth.init();
		if (auth.isLoggedIn) goto('/jurnal');
		if (!gInitialized) {
			gInitialized = true;
			loadGoogleSDK();
			api.majors.list().then(m => { majorsList = m; }).catch(() => {});
		}
	});

	async function handleLogin(e: SubmitEvent) {
		e.preventDefault();
		error = ''; loading = true;
		try {
			const res = await api.auth.login(nis.includes('@') ? nis : `${nis}@sekolah.sch.id`, password);
			auth.login(res.token, res.user);
			goto('/jurnal');
		} catch (err) {
			error = (err as Error).message;
		} finally { loading = false; }
	}

	function mountGoogleButtons() {
		if (!GOOGLE_CLIENT_ID) return;
		(window as any).google.accounts.id.initialize({
			client_id: GOOGLE_CLIENT_ID,
			callback: handleGoogleCallback,
		});
		for (const id of ['g-btn-mobile', 'g-btn-desktop']) {
			const el = document.getElementById(id);
			if (el) {
				(window as any).google.accounts.id.renderButton(el, {
					theme: 'outline',
					size: 'large',
					width: el.offsetWidth || 350,
					text: 'signin_with',
					locale: 'id',
				});
			}
		}
	}

	function loadGoogleSDK() {
		if (!GOOGLE_CLIENT_ID) return;
		if ((window as any).google?.accounts?.id) { mountGoogleButtons(); return; }
		if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) return;
		const script = document.createElement('script');
		script.src = 'https://accounts.google.com/gsi/client';
		script.onload = mountGoogleButtons;
		document.head.appendChild(script);
	}

	async function handleGoogleCallback(response: { credential: string }) {
		error = ''; loading = true;
		try {
			const res = await api.auth.google(response.credential);
			if (res.needsOnboarding) {
				googleData = res.googleData!;
				obName = res.googleData!.name;
				showOnboarding = true;
			} else {
				auth.login(res.token!, res.user!);
				goto('/jurnal');
			}
		} catch (err) {
			error = (err as Error).message;
		} finally { loading = false; }
	}

	async function handleOnboard(e: SubmitEvent) {
		e.preventDefault();
		obError = ''; obSaving = true;
		try {
			const res = await api.auth.onboard({
				email: googleData!.email,
				name: obName,
				role: obRole,
				phone: obPhone || undefined,
				nis: obRole === 'student' ? obNis : undefined,
				class: obRole === 'student' ? obClass : undefined,
				majorId: obRole === 'student' ? obMajorId || undefined : undefined,
			});
			if ((res as any).needsApproval) {
				showOnboarding = false;
				showApprovalMessage = true;
				return;
			}
			if (res.token && res.user) {
				auth.login(res.token, res.user);
				goto('/jurnal');
			}
		} catch (err) {
			obError = (err as Error).message;
		} finally { obSaving = false; }
	}
</script>

<!-- Onboarding Modal (shared mobile + desktop) -->
{#if showOnboarding && googleData}
	<div class="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
		<div class="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
			<div class="bg-gradient-to-r from-[#1F4E79] to-blue-500 rounded-t-2xl px-6 py-5">
				<div class="flex items-center gap-3">
					{#if googleData.picture}
						<img src={googleData.picture} alt="avatar" class="w-12 h-12 rounded-full border-2 border-white/40"/>
					{/if}
					<div>
						<p class="text-white font-bold text-base">Selamat datang!</p>
						<p class="text-blue-200 text-sm">{googleData.email}</p>
					</div>
				</div>
			</div>

			<div class="p-6 overflow-y-auto flex-1">
				<p class="text-sm text-gray-500 mb-4">Lengkapi data diri Anda untuk melanjutkan. Nama bisa diubah dari nama Google Anda.</p>

				{#if obError}
					<div class="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">{obError}</div>
				{/if}

				<form onsubmit={handleOnboard} class="space-y-4">
					<div>
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5" for="ob-name">Nama Lengkap</label>
						<input id="ob-name" type="text" bind:value={obName} required
							class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 focus:border-[#1F4E79]"
							placeholder="Nama lengkap sesuai rapor"/>
					</div>

					<div>
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5" for="ob-role">Tipe Pengguna</label>
						<select id="ob-role" bind:value={obRole}
							class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 bg-white">
							<option value="student">Siswa</option>
							<option value="teacher">Guru Pembimbing</option>
							<option value="industry">Pembimbing Industri</option>
							<option value="parent">Orang Tua</option>
						</select>
					</div>

					<div>
						<label class="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5" for="ob-phone">No. HP <span class="font-normal text-gray-400">(opsional)</span></label>
						<input id="ob-phone" type="tel" bind:value={obPhone}
							class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30"
							placeholder="08xxxxxxxxxx"/>
					</div>

					{#if obRole === 'student'}
						<div class="bg-blue-50 rounded-xl p-4 space-y-3">
							<p class="text-xs font-bold text-[#1F4E79] uppercase tracking-wide">Data Siswa</p>
							<div>
								<label class="block text-xs font-semibold text-gray-500 mb-1" for="ob-nis">NIS</label>
								<input id="ob-nis" type="text" bind:value={obNis} required
									class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 bg-white"
									placeholder="Nomor Induk Siswa"/>
							</div>
							<div>
								<label class="block text-xs font-semibold text-gray-500 mb-1" for="ob-class">Kelas</label>
								<input id="ob-class" type="text" bind:value={obClass}
									class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 bg-white"
									placeholder="Mis: XII TKRO 1"/>
							</div>
							<div>
								<label class="block text-xs font-semibold text-gray-500 mb-1" for="ob-major">Jurusan</label>
								<select id="ob-major" bind:value={obMajorId}
									class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/30 bg-white">
									<option value="">— Pilih jurusan —</option>
									{#each majorsList as m}
										<option value={m.id}>{m.code} — {m.name}</option>
									{/each}
								</select>
							</div>
						</div>
					{/if}

					<button type="submit" disabled={obSaving}
						class="w-full bg-[#1F4E79] text-white font-bold rounded-xl py-3.5 text-sm hover:bg-[#163d5e] disabled:opacity-60 transition-colors">
						{obSaving ? 'Menyimpan...' : 'Simpan & Masuk'}
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- Approval pending message -->
{#if showApprovalMessage}
	<div class="fixed inset-0 bg-[#1F4E79] z-50 flex items-center justify-center p-6">
		<div class="text-center max-w-sm">
			<div class="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
				<svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
				</svg>
			</div>
			<h2 class="text-2xl font-bold text-white mb-3">Pendaftaran Berhasil!</h2>
			<p class="text-blue-200 text-sm leading-relaxed mb-2">
				Akun Anda sudah dibuat dan sedang menunggu persetujuan dari <strong class="text-white">admin atau koordinator PKL</strong>.
			</p>
			<p class="text-blue-300 text-xs leading-relaxed mb-8">
				Anda akan bisa login setelah akun disetujui. Silakan hubungi guru pembimbing Anda untuk mempercepat proses persetujuan.
			</p>
			<button
				onclick={() => showApprovalMessage = false}
				class="bg-white text-[#1F4E79] font-bold px-6 py-3 rounded-xl text-sm hover:bg-blue-50 transition-colors"
			>
				Kembali ke Login
			</button>
		</div>
	</div>
{/if}

<!-- Mobile -->
<div class="lg:hidden min-h-screen bg-[#1F4E79] flex flex-col">
	<div class="flex flex-col items-center pt-12 pb-8 px-6">
		<div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-4">
			<svg class="w-9 h-9 text-[#1F4E79]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
			</svg>
		</div>
		<h1 class="text-3xl font-bold text-white tracking-wide">JURNAL PKL</h1>
		<p class="text-blue-200 text-sm mt-1">SMK Negeri 1 Contoh</p>
	</div>

	<div class="flex-1 bg-white rounded-t-3xl px-6 pt-8 pb-10 shadow-2xl">
		<h2 class="text-lg font-bold text-gray-800 mb-1">Masuk ke Akun</h2>
		<p class="text-gray-400 text-sm mb-6">Gunakan NIS dan password Anda</p>

		<!-- Google login button -->
		<div id="g-btn-mobile" class="w-full mb-4 min-h-[44px]"></div>

		<div class="flex items-center gap-3 mb-4">
			<div class="flex-1 h-px bg-gray-200"></div>
			<span class="text-xs text-gray-400 font-medium">atau</span>
			<div class="flex-1 h-px bg-gray-200"></div>
		</div>

		{@render loginForm()}
	</div>
</div>

<!-- Desktop -->
<div class="hidden lg:flex min-h-screen">
	<div class="w-1/2 bg-[#1F4E79] flex flex-col items-center justify-center p-16 relative overflow-hidden">
		<div class="absolute -top-20 -left-20 w-80 h-80 bg-white/5 rounded-full"></div>
		<div class="absolute -bottom-32 -right-16 w-96 h-96 bg-white/5 rounded-full"></div>

		<div class="relative z-10 text-center max-w-sm">
			<div class="w-20 h-20 bg-white rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-6">
				<svg class="w-11 h-11 text-[#1F4E79]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
				</svg>
			</div>
			<h1 class="text-4xl font-bold text-white tracking-wide mb-3">JURNAL PKL</h1>
			<p class="text-blue-200 text-base mb-8">SMK Negeri 1 Contoh</p>

			<div class="space-y-3 text-left">
				{#each [
					{ icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', label: 'Kompilasi jurnal otomatis dengan AI' },
					{ icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', label: 'Input suara — tinggal ngomong' },
					{ icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', label: 'Rekap & feedback dari guru' },
				] as f}
					<div class="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
						<div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
							<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={f.icon}/>
							</svg>
						</div>
						<p class="text-sm text-blue-100">{f.label}</p>
					</div>
				{/each}
			</div>
		</div>
	</div>

	<div class="w-1/2 bg-gray-50 flex items-center justify-center p-16">
		<div class="w-full max-w-md">
			<div class="mb-8">
				<h2 class="text-2xl font-bold text-gray-900 mb-1">Masuk ke Akun</h2>
				<p class="text-gray-400 text-sm">Gunakan NIS atau email dan password Anda</p>
			</div>

			<!-- Google button -->
			<div id="g-btn-desktop" class="w-full mb-5 min-h-[44px]"></div>

			<div class="flex items-center gap-3 mb-5">
				<div class="flex-1 h-px bg-gray-200"></div>
				<span class="text-xs text-gray-400 font-medium">atau masuk dengan NIS</span>
				<div class="flex-1 h-px bg-gray-200"></div>
			</div>

			{@render loginForm()}

			<p class="text-center text-xs text-gray-400 mt-6">Butuh bantuan? Hubungi guru pembimbing Anda</p>
		</div>
	</div>
</div>

<!-- Hidden fallback for Google button -->
<div id="google-btn-fallback" class="hidden"></div>

{#snippet loginForm()}
	{#if error}
		<div class="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
			<svg class="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
				<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
			</svg>
			{error}
		</div>
	{/if}

	<form onsubmit={handleLogin} class="space-y-4">
		<div>
			<label class="block text-sm font-semibold text-gray-700 mb-1.5" for="nis">NIS Siswa</label>
			<div class="relative">
				<div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
					<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
					</svg>
				</div>
				<input id="nis" type="text" bind:value={nis} required autocomplete="username"
					class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/40 focus:border-[#1F4E79] bg-white"
					placeholder="Masukkan NIS atau email"/>
			</div>
		</div>

		<div>
			<label class="block text-sm font-semibold text-gray-700 mb-1.5" for="password">Password</label>
			<div class="relative">
				<div class="absolute inset-y-0 left-3 flex items-center pointer-events-none">
					<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
					</svg>
				</div>
				<input id="password" type="password" bind:value={password} required autocomplete="current-password"
					class="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/40 focus:border-[#1F4E79] bg-white"
					placeholder="••••••••"/>
			</div>
		</div>

		<div class="flex justify-end">
			<button type="button" class="text-xs text-[#1F4E79] hover:underline">Lupa password?</button>
		</div>

		<button type="submit" disabled={loading}
			class="w-full bg-[#1F4E79] text-white font-bold rounded-xl py-3.5 text-sm hover:bg-[#163d5e] disabled:opacity-60 transition-colors shadow-md">
			{loading ? 'Memproses...' : 'MASUK KE JURNAL'}
		</button>
	</form>
{/snippet}

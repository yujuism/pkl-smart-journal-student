<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { auth } from '$lib/auth.svelte';

	let { children } = $props();

	const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

	$effect(() => {
		auth.init();
		if (!auth.isLoggedIn) { goto('/'); return; }
		fetch(`${BASE}/api/auth/me`, {
			headers: { Authorization: `Bearer ${auth.token}` }
		}).then(r => {
			if (r.status === 401) { auth.logout(); window.location.href = '/'; }
		}).catch(() => {});
	});

	const tabs = [
		{
			label: 'Jurnal',
			href: '/jurnal',
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>`,
			desc: 'Isi jurnal harian',
		},
		{
			label: 'Rekap',
			href: '/jurnal/rekap',
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>`,
			desc: 'Riwayat jurnal',
		},
		{
			label: 'Profil',
			href: '/jurnal/profil',
			icon: `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>`,
			desc: 'Info PKL & akun',
		},
	];

	function isActive(href: string) {
		if (href === '/jurnal') return $page.url.pathname === '/jurnal'
		return $page.url.pathname === href || $page.url.pathname.startsWith(href + '/')
	}
</script>

<!-- ═══ MOBILE LAYOUT (< lg) ═══════════════════════════════════════════════ -->
<div class="lg:hidden min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
	<header class="bg-[#1F4E79] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-md">
		<div class="flex items-center gap-2.5">
			<div class="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
				<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
				</svg>
			</div>
			<div>
				<p class="text-sm font-bold leading-none">JURNAL PKL</p>
				<p class="text-blue-200 text-xs leading-none mt-0.5">{auth.user?.name ?? 'Siswa'}</p>
			</div>
		</div>
		<div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
			<span class="text-white text-xs font-bold">{auth.user?.name?.[0] ?? '?'}</span>
		</div>
	</header>

	<main class="flex-1 overflow-y-auto pb-20">
		{@render children()}
	</main>

	<nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-100 flex shadow-lg z-20">
		{#each tabs as tab}
			<a
				href={tab.href}
				class="flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors relative
					{isActive(tab.href) ? 'text-[#1F4E79]' : 'text-gray-400'}"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					{@html tab.icon}
				</svg>
				<span class="text-xs font-medium">{tab.label}</span>
				{#if isActive(tab.href)}
					<span class="absolute bottom-0 w-8 h-0.5 bg-[#1F4E79] rounded-t-full"></span>
				{/if}
			</a>
		{/each}
	</nav>
</div>

<!-- ═══ DESKTOP LAYOUT (≥ lg) ═════════════════════════════════════════════= -->
<div class="hidden lg:flex min-h-screen bg-gray-100">
	<!-- Sidebar -->
	<aside class="w-64 bg-[#1F4E79] flex flex-col fixed h-full z-20">
		<!-- Brand -->
		<div class="px-6 py-6 border-b border-white/10">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
					<svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
					</svg>
				</div>
				<div>
					<p class="text-white font-bold text-sm leading-tight">Jurnal PKL</p>
					<p class="text-blue-300 text-xs">Smart Journal</p>
				</div>
			</div>
		</div>

		<!-- User info -->
		<div class="px-6 py-4 border-b border-white/10">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
					<span class="text-white text-sm font-bold">{auth.user?.name?.[0] ?? '?'}</span>
				</div>
				<div class="min-w-0">
					<p class="text-white text-sm font-semibold truncate">{auth.user?.name ?? '-'}</p>
					<p class="text-blue-300 text-xs">Siswa PKL</p>
				</div>
			</div>
		</div>

		<!-- Nav links -->
		<nav class="flex-1 px-3 py-4 space-y-1">
			{#each tabs as tab}
				<a
					href={tab.href}
					class="flex items-center gap-3 px-3 py-3 rounded-xl transition-all group
						{isActive(tab.href)
							? 'bg-white/15 text-white'
							: 'text-blue-200 hover:bg-white/10 hover:text-white'}"
				>
					<svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						{@html tab.icon}
					</svg>
					<div>
						<p class="text-sm font-semibold leading-none">{tab.label}</p>
						<p class="text-xs mt-0.5 opacity-60">{tab.desc}</p>
					</div>
					{#if isActive(tab.href)}
						<span class="ml-auto w-1.5 h-1.5 bg-white rounded-full"></span>
					{/if}
				</a>
			{/each}
		</nav>

		<!-- Footer -->
		<div class="px-4 py-4 border-t border-white/10 space-y-2">
			<button onclick={() => { auth.logout(); goto('/'); }}
				class="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all text-sm font-medium">
				<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
				</svg>
				Keluar
			</button>
			<p class="text-blue-300 text-xs text-center">PKL Smart Journal © 2026</p>
		</div>
	</aside>

	<!-- Main content area -->
	<div class="ml-64 flex-1 flex flex-col min-h-screen">
		<!-- Top bar -->
		<header class="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
			<div>
				<h1 class="text-lg font-bold text-gray-900">
					{#if isActive('/jurnal/rekap')}Rekap Jurnal
					{:else if isActive('/jurnal/profil')}Profil & Info PKL
					{:else}Isi Jurnal Harian{/if}
				</h1>
				<p class="text-xs text-gray-400">
					{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
				</p>
			</div>
			<div class="flex items-center gap-3">
				<div class="text-right">
					<p class="text-sm font-semibold text-gray-800">{auth.user?.name ?? '-'}</p>
					<p class="text-xs text-gray-400">Siswa PKL</p>
				</div>
				<div class="w-9 h-9 bg-[#1F4E79] rounded-full flex items-center justify-center">
					<span class="text-white text-sm font-bold">{auth.user?.name?.[0] ?? '?'}</span>
				</div>
			</div>
		</header>

		<!-- Page content -->
		<main class="flex-1 p-8 max-w-4xl w-full">
			{@render children()}
		</main>
	</div>
</div>

<script lang="ts">
	import { goto } from '$app/navigation';
	import { auth } from '$lib/auth.svelte';
	import { api, type Placement } from '$lib/api';

	let placement = $state<Placement | null>(null);

	$effect(() => {
		auth.init();
		if (!auth.isLoggedIn) { goto('/'); }
	});

	let initialized = false;
	$effect(() => {
		if (!auth.isLoggedIn || initialized) return;
		initialized = true;
		api.placements.my().then((list) => { placement = list?.[0] ?? null; }).catch(() => {});
	});

	function handleLogout() { auth.logout(); goto('/'); }

	function formatDate(d: string) {
		return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
	}
</script>

<!-- Mobile -->
<div class="lg:hidden p-4 space-y-4">
	<div>
		<p class="text-xs text-gray-400 uppercase tracking-wide font-medium">Akun</p>
		<p class="text-base font-bold text-gray-800">Profil Saya</p>
	</div>
	{@render profileCard()}
	{#if placement}{@render pklCard()}{/if}
	{@render logoutBtn()}
</div>

<!-- Desktop -->
<div class="hidden lg:block space-y-6">
	<div>
		<p class="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">Akun Saya</p>
		<p class="text-2xl font-bold text-gray-900">Profil & Info PKL</p>
	</div>

	<div class="grid grid-cols-2 gap-6">
		<div class="space-y-4">
			{@render profileCard()}
			{@render logoutBtn()}
		</div>
		<div>
			{#if placement}
				{@render pklCard()}
			{:else}
				<div class="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
					<p class="text-sm text-gray-400">Belum ada data penempatan PKL</p>
				</div>
			{/if}
		</div>
	</div>
</div>

{#snippet profileCard()}
	<div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
		<div class="bg-gradient-to-r from-[#1F4E79] to-blue-500 px-4 lg:px-6 py-5 lg:py-6 flex items-center gap-4">
			<div class="w-14 h-14 lg:w-16 lg:h-16 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
				<span class="text-white text-2xl lg:text-3xl font-bold">{auth.user?.name?.[0] ?? '?'}</span>
			</div>
			<div>
				<p class="text-white font-bold text-base lg:text-lg">{auth.user?.name ?? '-'}</p>
				<p class="text-blue-200 text-xs lg:text-sm capitalize mt-0.5">Siswa PKL</p>
			</div>
		</div>
		<div class="p-4 lg:p-5 space-y-0 divide-y divide-gray-50">
			<div class="flex items-center justify-between py-2.5">
				<span class="text-xs text-gray-500 font-medium">Email</span>
				<span class="text-sm text-gray-800">{auth.user?.email ?? '-'}</span>
			</div>
			<div class="flex items-center justify-between py-2.5">
				<span class="text-xs text-gray-500 font-medium">Role</span>
				<span class="text-xs font-semibold bg-blue-100 text-[#1F4E79] px-2 py-0.5 rounded-full capitalize">{auth.user?.role ?? '-'}</span>
			</div>
		</div>
	</div>
{/snippet}

{#snippet pklCard()}
	<div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 lg:p-5 space-y-4">
		<p class="text-xs font-bold text-gray-500 uppercase tracking-wide">Informasi PKL</p>

		<div class="space-y-3">
			<div class="flex items-start gap-3">
				<div class="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
					<svg class="w-4 h-4 text-[#1F4E79]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
					</svg>
				</div>
				<div>
					<p class="text-xs text-gray-400">Perusahaan</p>
					<p class="text-sm font-semibold text-gray-800">{placement!.companyName}</p>
					{#if placement!.companyAddress}
						<p class="text-xs text-gray-500 mt-0.5">{placement!.companyAddress}</p>
					{/if}
				</div>
			</div>

			<div class="flex items-start gap-3">
				<div class="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
					<svg class="w-4 h-4 text-[#1F4E79]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
					</svg>
				</div>
				<div>
					<p class="text-xs text-gray-400">Periode PKL</p>
					<p class="text-sm font-semibold text-gray-800">
						{placement!.startDate ? formatDate(placement!.startDate) : '–'} – {placement!.endDate ? formatDate(placement!.endDate) : '–'}
					</p>
				</div>
			</div>

			<div class="flex items-center justify-between pt-1 border-t border-gray-50">
				<span class="text-xs text-gray-400">Status</span>
				<span class="text-xs font-semibold px-2.5 py-1 rounded-full
					{placement!.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
					{placement!.status === 'active' ? 'Aktif PKL' : placement!.status}
				</span>
			</div>
		</div>
	</div>
{/snippet}

{#snippet logoutBtn()}
	<button onclick={handleLogout}
		class="w-full flex items-center justify-center gap-2 border-2 border-red-200 text-red-500 font-semibold rounded-2xl py-3.5 text-sm hover:bg-red-50 transition-colors">
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
		</svg>
		Keluar dari Akun
	</button>
{/snippet}

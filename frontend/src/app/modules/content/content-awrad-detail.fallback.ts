import { WirdCollectionDetail } from '../../core/services/content-editor.service';

/** Offline demo data when the detail API is unavailable (e.g. backend not restarted). */
export function buildAwradDetailFallback(id: number): WirdCollectionDetail {
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString();
  const dailyTrend = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now.getTime() - (29 - i) * 86400000);
    const base = 12 + Math.floor(i * 0.8);
    return {
      date: d.toISOString().slice(0, 10),
      usage: base + (i % 5),
      completions: base - 2 + (i % 3),
      members: 8200 + i * 12,
    };
  });

  const items = [
    { stepId: 1, orderIndex: 0, contentItemId: 1, itemName: 'Khulasa', type: 'Dhikr', count: 1, category: 'Opening', status: 'Published', lastUpdated: daysAgo(3) },
    { stepId: 2, orderIndex: 1, contentItemId: 2, itemName: 'Salawat Nariyah', type: 'Salawat', count: 100, category: 'Salawat', status: 'Published', lastUpdated: daysAgo(5) },
    { stepId: 3, orderIndex: 2, contentItemId: 3, itemName: 'Ya Latif', type: 'Dhikr', count: 129, category: 'Names', status: 'Published', lastUpdated: daysAgo(1) },
    { stepId: 4, orderIndex: 3, contentItemId: 4, itemName: 'Astaghfirullah', type: 'Dhikr', count: 100, category: 'Istighfar', status: 'Published', lastUpdated: daysAgo(2) },
    { stepId: 5, orderIndex: 4, contentItemId: 5, itemName: 'La ilaha illallah', type: 'Dhikr', count: 100, category: 'Tahlil', status: 'Published', lastUpdated: daysAgo(4) },
  ];

  return {
    collection: {
      id,
      name: 'Khulasa Wird (Morning)',
      tariqa: 'BaAlawi',
      type: 'Daily',
      recommendedTime: 'After Fajr',
      description: "The daily morning wird of the Ba'alawi path, from Khulasa and selected awrad for spiritual protection, blessing, and connection.",
      status: 'Published',
      createdAt: daysAgo(120),
      updatedAt: daysAgo(2),
    },
    items,
    stats: {
      totalItems: 32,
      totalMembers: 8456,
      activeToday: 2341,
      completionRate: 63,
      engagementRate: 63,
      memberGrowthPercent: 2.3,
      views: 12400,
      completions: 7800,
      lastUpdated: daysAgo(2),
      totalItemsTrend: 0,
      totalMembersTrend: 18,
      activeTodayTrend: 22,
      completionRateTrend: 12,
      engagementRateTrend: 12,
    },
    recentActivity: [
      { userId: '1', userName: 'Admin', userInitials: 'AD', action: "updated item 'Ya Latif' count", at: daysAgo(0) },
      { userId: '2', userName: 'Ahmed Khan', userInitials: 'AK', action: 'joined collection', at: daysAgo(0) },
      { userId: '1', userName: 'Admin', userInitials: 'AD', action: 'updated collection description', at: daysAgo(1) },
      { userId: '1', userName: 'Admin', userInitials: 'AD', action: "added item 'Astaghfirullah'", at: daysAgo(1) },
      { userId: '1', userName: 'Admin', userInitials: 'AD', action: 'published collection', at: daysAgo(3) },
    ],
    analytics: {
      views: 12400,
      completions: 7800,
      engagement: 63,
      growth: 2.3,
      dailyTrend,
    },
    recentMembers: [
      { userId: '2', name: 'Ahmed Khan', initials: 'AK' },
      { userId: '3', name: 'Bilal Hassan', initials: 'BH' },
      { userId: '4', name: 'Fatima Ali', initials: 'FA' },
      { userId: '5', name: 'Omar Yusuf', initials: 'OY' },
      { userId: '6', name: 'Sara Ahmed', initials: 'SA' },
    ],
    members: [],
  };
}

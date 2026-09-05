/**
 * Project 1M Quest Tracker - Store & State Management
 * Handles persistent LocalStorage data for levels, custom levels, Tas Harta assets,
 * deposits, custom uploaded images, and guides.
 */

const DEFAULT_LEVELS = {
  level1: {
    id: 'level1',
    title: 'Level 1: Side Hustle (HSH)',
    badge: 'Level 1 • Tuntas Selesai',
    icon: 'coffee',
    emoji: '☕',
    customImage: null,
    guide: 'Fokus tawarkan jasa mikro dan jual 3 barang preloved pertama untuk modal awal Rp 300.000.',
    collected: 300000,
    target: 300000,
    completed: true,
    deleted: false,
    order: 1
  },
  level2: {
    id: 'level2',
    title: 'Level 2: Affiliate & Creator',
    badge: 'Level 2 • Tuntas Selesai',
    icon: 'smartphone',
    emoji: '📱',
    customImage: null,
    guide: 'Bangun akun keranjang kuning dan upload video unboxing setiap sore untuk komisi affiliate.',
    collected: 500000,
    target: 500000,
    completed: true,
    deleted: false,
    order: 2
  },
  level3: {
    id: 'level3',
    title: 'Level 3: Bisnis & Agensi Mini',
    badge: 'Level 3 • Sedang Ditempuh',
    icon: 'business_center',
    emoji: '💼',
    customImage: null,
    guide: 'Fokus posting 3 listing per hari dan bangun relasi pembeli pertama. Pastikan respons pesan di bawah 15 menit.',
    collected: 150000,
    target: 200000,
    completed: false,
    active: true,
    deleted: false,
    order: 3
  },
  sidequest: {
    id: 'sidequest',
    title: 'Side Quest: Clipper Reward',
    badge: 'Side Quest • Misi Tambahan',
    icon: 'movie',
    emoji: '🎬',
    customImage: null,
    guide: 'Upload 3 klip pendek viral TikTok / Reels setiap hari untuk melipatgandakan penghasilan komisi.',
    collected: 120000,
    target: 200000,
    completed: false,
    deleted: false,
    isSideQuest: true
  },
  level4: {
    id: 'level4',
    title: 'Level 4: Level Kustom User',
    badge: 'Level 4 • Target Lanjutan',
    icon: 'edit_note',
    emoji: '📝',
    customImage: null,
    guide: 'Tentukan misi pribadi Anda di sini (misal: jualan hampers, catering mingguan, atau jasa digital).',
    collected: 0,
    target: 200000,
    completed: false,
    deleted: false,
    order: 4
  },
  finish: {
    id: 'finish',
    title: 'Puncak 1 Juta (Project 1M)',
    badge: 'Puncak Ekspedisi 1 Juta',
    icon: 'workspace_premium',
    emoji: '🏆',
    customImage: null,
    guide: 'Selamat! Ini adalah puncak milestone target pertama Rp 1.000.000 sebagai pondasi kebebasan finansial Anda.',
    collected: 0,
    target: 1000000,
    completed: false,
    deleted: false,
    isApex: true
  }
};

const DEFAULT_ASSETS = [
  {
    id: 'asset-1',
    name: 'Akun Affiliate TikTok Camilan',
    type: 'Affiliate Content',
    status: 'Aktif',
    revenue: 'Rp 250.000 / bln',
    icon: 'storefront',
    date: '2026-08-15'
  },
  {
    id: 'asset-2',
    name: 'Jasa Portofolio & Web Landing',
    type: 'Digital Service',
    status: 'Aktif',
    revenue: 'Rp 400.000 / order',
    icon: 'code',
    date: '2026-08-20'
  },
  {
    id: 'asset-3',
    name: 'Channel Kliping Video Viral',
    type: 'Creative Media',
    status: 'Persiapan',
    revenue: 'Rp 150.000 / bln',
    icon: 'smart_display',
    date: '2026-09-01'
  }
];

class StoreManager {
  constructor() {
    this.STORAGE_KEYS = {
      LEVELS: 'p1m_levels_data_v3',
      DYNAMIC_LEVELS: 'p1m_dynamic_levels_v3',
      ASSETS: 'p1m_assets_data_v3',
      TRANSACTIONS: 'p1m_transactions_v3',
      APEX_TARGET: 'p1m_apex_target_v3'
    };

    this.loadData();
    this.initCloudSync();
  }

  initCloudSync() {
    const connect = () => {
      if (typeof window !== 'undefined' && window.FirebaseSync) {
        window.FirebaseSync.listenToCloud((cloudData) => {
          if (cloudData && (cloudData.levels || cloudData.transactions)) {
            this.importCloudData(cloudData);
          } else {
            console.log('[Store] Cloud kosong, mengunggah data lokal awal ke Firebase...');
            window.FirebaseSync.saveToCloud(this.exportData(), true);
          }
        });
      }
    };

    if (typeof window !== 'undefined' && window.FirebaseSync) {
      connect();
    } else if (typeof window !== 'undefined') {
      window.addEventListener('DOMContentLoaded', connect);
    }
  }

  exportData() {
    return {
      levels: this.levels,
      dynamicLevels: this.dynamicLevels,
      assets: this.assets,
      transactions: this.transactions,
      apexTarget: this.apexTarget
    };
  }

  importCloudData(cloudData) {
    if (!cloudData) return;

    if (cloudData.levels && typeof cloudData.levels === 'object') {
      this.levels = cloudData.levels;
      Object.keys(DEFAULT_LEVELS).forEach((k) => {
        if (!this.levels[k]) {
          this.levels[k] = JSON.parse(JSON.stringify(DEFAULT_LEVELS[k]));
        }
      });
      localStorage.setItem(this.STORAGE_KEYS.LEVELS, JSON.stringify(this.levels));
    }

    if (Array.isArray(cloudData.dynamicLevels)) {
      this.dynamicLevels = cloudData.dynamicLevels;
      localStorage.setItem(this.STORAGE_KEYS.DYNAMIC_LEVELS, JSON.stringify(this.dynamicLevels));
    }

    if (Array.isArray(cloudData.assets)) {
      this.assets = cloudData.assets;
      localStorage.setItem(this.STORAGE_KEYS.ASSETS, JSON.stringify(this.assets));
    }

    if (Array.isArray(cloudData.transactions)) {
      this.transactions = cloudData.transactions;
      localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
    }

    if (cloudData.apexTarget !== undefined) {
      this.apexTarget = Number(cloudData.apexTarget);
      localStorage.setItem(this.STORAGE_KEYS.APEX_TARGET, this.apexTarget.toString());
    } else {
      this.recalculateApex();
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('p1m-cloud-synced', { detail: { source: 'remote' } }));
    }
  }

  loadData() {
    // Load Levels
    const savedLevels = localStorage.getItem(this.STORAGE_KEYS.LEVELS);
    if (savedLevels) {
      try {
        this.levels = JSON.parse(savedLevels);
        Object.keys(DEFAULT_LEVELS).forEach((k) => {
          if (!this.levels[k]) {
            this.levels[k] = JSON.parse(JSON.stringify(DEFAULT_LEVELS[k]));
          }
        });
      } catch (e) {
        this.levels = JSON.parse(JSON.stringify(DEFAULT_LEVELS));
      }
    } else {
      this.levels = JSON.parse(JSON.stringify(DEFAULT_LEVELS));
    }

    // Load Dynamic Levels (Endless Expansion)
    const savedDynamic = localStorage.getItem(this.STORAGE_KEYS.DYNAMIC_LEVELS);
    if (savedDynamic) {
      try {
        this.dynamicLevels = JSON.parse(savedDynamic);
      } catch (e) {
        this.dynamicLevels = [];
      }
    } else {
      this.dynamicLevels = [];
    }

    // Load Assets (Tas Harta)
    const savedAssets = localStorage.getItem(this.STORAGE_KEYS.ASSETS);
    if (savedAssets) {
      try {
        this.assets = JSON.parse(savedAssets);
      } catch (e) {
        this.assets = JSON.parse(JSON.stringify(DEFAULT_ASSETS));
      }
    } else {
      this.assets = JSON.parse(JSON.stringify(DEFAULT_ASSETS));
    }

    // Load Transactions Log
    const savedTx = localStorage.getItem(this.STORAGE_KEYS.TRANSACTIONS);
    if (savedTx) {
      try {
        this.transactions = JSON.parse(savedTx);
      } catch (e) {
        this.transactions = [];
      }
    } else {
      this.transactions = [
        {
          id: 'tx-1',
          levelId: 'level1',
          levelTitle: 'Level 1: Side Hustle (HSH)',
          amount: 300000,
          date: '01 Sep 2026, 14:20',
          note: 'Penjualan 3 item preloved & jasa micro'
        },
        {
          id: 'tx-2',
          levelId: 'level2',
          levelTitle: 'Level 2: Affiliate & Creator',
          amount: 500000,
          date: '03 Sep 2026, 18:45',
          note: 'Komisi affiliate video snack viral'
        },
        {
          id: 'tx-3',
          levelId: 'sidequest',
          levelTitle: 'Side Quest: Clipper Reward',
          amount: 120000,
          date: '04 Sep 2026, 20:10',
          note: 'Bonus views klip Reels'
        },
        {
          id: 'tx-4',
          levelId: 'level3',
          levelTitle: 'Level 3: Bisnis & Agensi Mini',
          amount: 150000,
          date: '05 Sep 2026, 09:30',
          note: 'DP klien perdana jasa agensi'
        }
      ];
    }

    // Load Apex Target
    const savedApex = localStorage.getItem(this.STORAGE_KEYS.APEX_TARGET);
    if (savedApex) {
      this.apexTarget = Number(savedApex);
    } else {
      this.recalculateApex();
    }
  }

  recalculateApex() {
    let base = 1000000;
    this.dynamicLevels.forEach((dl) => {
      if (!dl.deleted) {
        base += Number(dl.target || 0);
      }
    });
    this.apexTarget = base;
  }

  save(skipCloud = false) {
    localStorage.setItem(this.STORAGE_KEYS.LEVELS, JSON.stringify(this.levels));
    localStorage.setItem(this.STORAGE_KEYS.DYNAMIC_LEVELS, JSON.stringify(this.dynamicLevels));
    localStorage.setItem(this.STORAGE_KEYS.ASSETS, JSON.stringify(this.assets));
    localStorage.setItem(this.STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
    localStorage.setItem(this.STORAGE_KEYS.APEX_TARGET, this.apexTarget.toString());

    if (!skipCloud && typeof window !== 'undefined' && window.FirebaseSync) {
      window.FirebaseSync.saveToCloud(this.exportData());
    }
  }

  getLevel(id) {
    if (this.levels[id]) return this.levels[id];
    return this.dynamicLevels.find((l) => l.id === id) || null;
  }

  /**
   * Update Level properties (Name, Target, Guide, Icon, Custom Image)
   * Target is ALWAYS editable and recalculates status/progress!
   */
  updateLevel(id, updates) {
    const level = this.getLevel(id);
    if (!level) return { success: false, error: 'Level tidak ditemukan' };

    if (updates.title !== undefined && updates.title.trim() !== '') {
      level.title = updates.title.trim();
    }

    if (updates.target !== undefined) {
      const newTarget = Math.max(0, Number(updates.target) || 0);
      const oldTarget = Number(level.target) || 0;

      if (level.isDynamic) {
        this.apexTarget = Math.max(1000000, this.apexTarget + (newTarget - oldTarget));
      } else if (level.isApex) {
        this.apexTarget = newTarget;
      }

      level.target = newTarget;
    }

    if (updates.guide !== undefined) {
      level.guide = updates.guide;
    }

    if (updates.customImage !== undefined) {
      level.customImage = updates.customImage; // base64 data string or null
    }

    if (updates.icon !== undefined) {
      level.icon = updates.icon;
    }

    if (updates.emoji !== undefined) {
      level.emoji = updates.emoji;
    }

    // Auto update completion status based on current collected vs new target
    if (level.target > 0) {
      level.completed = Number(level.collected || 0) >= level.target;
    } else {
      level.completed = false;
    }

    this.save();
    return { success: true, level };
  }

  /**
   * Delete Level
   * Supports dynamic levels AND base levels!
   * Seamlessly connects path for remaining levels.
   */
  deleteLevel(id) {
    // 1. Dynamic level
    const dynIndex = this.dynamicLevels.findIndex((l) => l.id === id);
    if (dynIndex !== -1) {
      const removed = this.dynamicLevels.splice(dynIndex, 1)[0];
      if (removed && removed.target) {
        this.apexTarget = Math.max(1000000, this.apexTarget - Number(removed.target));
      }
      this.save();
      return { success: true, deletedId: id };
    }

    // 2. Base level (mark as deleted so it hides from roadmap and SVG path auto-bypasses it)
    if (this.levels[id]) {
      if (this.levels[id].isApex) {
        return { success: false, error: 'Puncak utama tidak dapat dihapus' };
      }
      this.levels[id].deleted = true;
      this.save();
      return { success: true, deletedId: id };
    }

    return { success: false, error: 'Level tidak ditemukan' };
  }

  saveGuide(levelId, guideText) {
    return this.updateLevel(levelId, { guide: guideText }).success;
  }

  addDeposit(levelId, amount, note = '') {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount === 0) return { success: false, error: 'Nominal tidak valid' };

    // Support typing negative amounts in deposit input
    if (numAmount < 0) {
      return this.subtractDeposit(levelId, Math.abs(numAmount), note);
    }

    const level = this.getLevel(levelId);
    if (!level) return { success: false, error: 'Level tidak ditemukan' };

    level.collected = (Number(level.collected) || 0) + numAmount;
    if (level.target > 0) {
      level.completed = level.collected >= level.target;
    }

    // Add transaction
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newTx = {
      id: 'tx-' + Date.now(),
      levelId: level.id,
      levelTitle: level.title,
      amount: numAmount,
      type: 'add',
      date: dateFormatted,
      note: note || 'Tabungan rutin level'
    };
    this.transactions.unshift(newTx);

    this.save();
    return { success: true, level, tx: newTx, type: 'add' };
  }

  subtractDeposit(levelId, amount, note = '') {
    const numAmount = Math.abs(Number(amount));
    if (isNaN(numAmount) || numAmount <= 0) return { success: false, error: 'Nominal pengurangan tidak valid' };

    const level = this.getLevel(levelId);
    if (!level) return { success: false, error: 'Level tidak ditemukan' };

    const currentCollected = Number(level.collected) || 0;
    if (currentCollected <= 0) {
      return { success: false, error: 'Tabungan level ini sudah Rp 0, tidak dapat dikurangi lagi.' };
    }

    // Deduct amount, clamping at 0
    const actualDeducted = Math.min(currentCollected, numAmount);
    level.collected = currentCollected - actualDeducted;

    // Recalculate completed status
    const target = Number(level.target) || 0;
    if (target > 0) {
      level.completed = level.collected >= target;
    } else {
      level.completed = false;
    }

    // Add subtraction transaction
    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }) + ', ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    const newTx = {
      id: 'tx-' + Date.now(),
      levelId: level.id,
      levelTitle: level.title,
      amount: -actualDeducted,
      type: 'subtract',
      date: dateFormatted,
      note: note || 'Penarikan / Penyesuaian dana level'
    };
    this.transactions.unshift(newTx);

    this.save();
    return { success: true, level, tx: newTx, deducted: actualDeducted, type: 'subtract' };
  }

  addDynamicLevel(data) {
    const newCount = this.dynamicLevels.length + 5;
    const levelId = 'level_' + Date.now();
    const targetAdd = Number(data.target) || 500000;

    const newLevel = {
      id: levelId,
      title: data.name || `Level ${newCount}: Ekspansi Baru`,
      badge: `Level ${newCount} • Ekspansi Baru`,
      icon: data.icon || 'rocket_launch',
      emoji: data.emoji || '🚀',
      customImage: data.customImage || null,
      guide: data.guide || 'Misi baru untuk mempercepat pencapaian finansial skala besar.',
      collected: 0,
      target: targetAdd,
      completed: false,
      deleted: false,
      isDynamic: true,
      order: newCount
    };

    this.dynamicLevels.push(newLevel);
    this.apexTarget += targetAdd;

    this.save();
    return newLevel;
  }

  addAsset(asset) {
    const newAsset = {
      id: 'asset-' + Date.now(),
      name: asset.name,
      type: asset.type || 'Mesin Uang',
      status: asset.status || 'Aktif',
      revenue: asset.revenue || 'Rp 150.000 / bln',
      icon: asset.icon || 'work',
      date: new Date().toISOString().split('T')[0]
    };
    this.assets.unshift(newAsset);
    this.save();
    return newAsset;
  }

  deleteAsset(assetId) {
    this.assets = this.assets.filter((a) => a.id !== assetId);
    this.save();
  }

  getTotals() {
    let totalCollected = 0;
    let sumMainTargets = 0;
    // Base levels (only non-deleted)
    Object.values(this.levels).forEach((l) => {
      if (!l.isApex && !l.deleted) {
        totalCollected += (Number(l.collected) || 0);
        if (!l.isSideQuest) {
          sumMainTargets += (Number(l.target) || 0);
        }
      }
    });

    // Dynamic levels (only non-deleted)
    this.dynamicLevels.forEach((l) => {
      if (!l.deleted) {
        totalCollected += (Number(l.collected) || 0);
        sumMainTargets += (Number(l.target) || 0);
      }
    });

    const targetGoal = Math.max(1000000, sumMainTargets, this.apexTarget);
    const pct = targetGoal > 0 ? Math.min(100, (totalCollected / targetGoal) * 100) : 0;

    return {
      totalCollected,
      targetGoal,
      pct: pct.toFixed(1),
      remaining: Math.max(0, targetGoal - totalCollected)
    };
  }

  resetAll() {
    localStorage.removeItem(this.STORAGE_KEYS.LEVELS);
    localStorage.removeItem(this.STORAGE_KEYS.DYNAMIC_LEVELS);
    localStorage.removeItem(this.STORAGE_KEYS.ASSETS);
    localStorage.removeItem(this.STORAGE_KEYS.TRANSACTIONS);
    localStorage.removeItem(this.STORAGE_KEYS.APEX_TARGET);
    this.loadData();
    if (typeof window !== 'undefined' && window.FirebaseSync) {
      window.FirebaseSync.saveToCloud(this.exportData(), true);
    }
  }
}

window.AppStore = new StoreManager();

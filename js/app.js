/**
 * Project 1M Quest Tracker - Main Application Logic
 * Coordinates roadmap path generation, universal level details, Tas Harta inventory,
 * dynamic level expansions, custom image uploads, level edits/deletions, theme switcher,
 * tabs, and notifications.
 */

(function () {
  'use strict';

  // --- Helpers ---
  function formatRp(num) {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  }

  function showToast(message, icon = 'check_circle') {
    const toast = document.getElementById('appToast');
    if (!toast) return;
    document.getElementById('toastMessage').textContent = message;
    document.getElementById('toastIcon').textContent = icon;
    toast.classList.remove('translate-y-24', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');

    if (window._toastTimeout) clearTimeout(window._toastTimeout);
    window._toastTimeout = setTimeout(() => {
      toast.classList.remove('translate-y-0', 'opacity-100');
      toast.classList.add('translate-y-24', 'opacity-0');
    }, 2800);
  }

  function compressImage(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 180;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        callback(dataUrl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function fireConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#fec659', '#1c3e25', '#38bdf8', '#ff7a59', '#34d399', '#a78bfa'];

    for (let i = 0; i < 40; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.position = 'absolute';
      piece.style.width = Math.random() * 8 + 6 + 'px';
      piece.style.height = Math.random() * 10 + 8 + 'px';
      piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      piece.style.left = Math.random() * 100 + 'vw';
      piece.style.top = '-20px';
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      piece.style.opacity = Math.random() * 0.7 + 0.3;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      piece.style.transition = `top ${Math.random() * 1.5 + 1.2}s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 2s ease-out, opacity 2s ease`;
      container.appendChild(piece);

      requestAnimationFrame(() => {
        piece.style.top = Math.random() * 80 + 20 + 'vh';
        piece.style.transform = `rotate(${Math.random() * 720}deg) scale(${Math.random() * 0.5 + 0.5})`;
        setTimeout(() => {
          piece.style.opacity = '0';
          setTimeout(() => piece.remove(), 800);
        }, 1500);
      });
    }
  }

  /**
   * Auto-grow textarea: resets height to auto, then sets it to scrollHeight.
   * Call on 'input' event and after programmatic value set.
   */
  function autoGrowTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  // --- Main Application Controller ---
  class AppController {
    constructor() {
      this.currentOpenLevelId = null;
      this.editingLevelId = null;
      this.tempEditImage = null; // Staged base64 image during edit
      this.tempAddImage = null;  // Staged base64 image during add level
      this.selectedEmoji = '🚀';
      this.selectedIcon = 'rocket_launch';
      this.activeTab = 'peta-level';
      this.depositMode = 'add';  // 'add' or 'subtract'
    }

    init() {
      // 1. Initialize Theme Engine
      window.ThemeEngine.init();

      // 2. Setup Top HUD & Banner
      this.updateBanner();

      // 3. Render Roadmap Nodes & SVG Paths
      this.renderRoadmap();

      // 4. Setup Theme Switcher UI & Events
      this.initThemeSwitcher();

      // 5. Setup Tas Harta UI
      this.initTasHarta();

      // 6. Setup Universal Level Bottom Sheet
      this.initUniversalSheet();

      // 7. Setup Edit Level Modal (Bug 1, 2, 3, 4 fixes)
      this.initEditLevelModal();

      // 8. Setup Add Level Modal
      this.initAddLevelModal();

      // 9. Setup Info Modal
      this.initInfoModal();

      // 10. Setup Navigation Tabs
      this.initTabs();

      // 11. Listen for theme change event to update SVG canvas colors
      window.addEventListener('p1m-theme-changed', () => {
        this.updateSvgColors();
        this.renderThemeOptions();
      });

      // 12. Listen for window resize to recalculate dynamic SVG curves
      window.addEventListener('resize', () => {
        this.updateSvgPaths();
      });

      // 13. Register Service Worker if supported
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
          console.log('SW registration skipped:', err);
        });
      }

      // 14. Setup Firebase Cloud Sync UI & Event Listeners
      this.initCloudSyncUI();

      window.addEventListener('p1m-cloud-synced', () => {
        this.refreshAll();
      });
    }

    refreshAll() {
      this.updateBanner();
      this.renderRoadmap();
      this.renderTasHartaList();
      if (this.activeTab === 'statistik') this.renderStatisticsTab();
      if (this.activeTab === 'kantong-tabungan') this.renderKantongTab();
      if (this.currentOpenLevelId) {
        this.populateUniversalSheet(this.currentOpenLevelId);
      }
    }

    initCloudSyncUI() {
      const btn = document.getElementById('cloudSyncBtn');
      const icon = document.getElementById('cloudStatusIcon');
      const dot = document.getElementById('cloudStatusDot');
      if (!btn) return;

      const updateUI = (status, label) => {
        if (!icon || !dot) return;
        if (status === 'synced') {
          icon.textContent = 'cloud_done';
          icon.className = 'material-symbols-outlined text-[20px] text-emerald-500';
          dot.className = 'absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-surface';
          btn.title = 'Firebase Cloud: Data Tersinkron Permanen (Klik untuk info)';
        } else if (status === 'syncing') {
          icon.textContent = 'sync';
          icon.className = 'material-symbols-outlined text-[20px] text-amber-500 animate-spin';
          dot.className = 'absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-surface animate-ping';
          btn.title = 'Firebase Cloud: Sedang Menyimpan Data...';
        } else if (status === 'offline') {
          icon.textContent = 'cloud_off';
          icon.className = 'material-symbols-outlined text-[20px] text-zinc-400';
          dot.className = 'absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-zinc-400 ring-2 ring-surface';
          btn.title = 'Firebase Cloud: Mode Offline (Data tersimpan aman di browser)';
        } else if (status === 'error') {
          icon.textContent = 'cloud_off';
          icon.className = 'material-symbols-outlined text-[20px] text-rose-500';
          dot.className = 'absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-surface';
          btn.title = 'Firebase Cloud: Gagal Terhubung ke Database';
        }
      };

      // Listen for status events from FirebaseSyncService
      window.addEventListener('p1m-cloud-status', (e) => {
        const { status, label } = e.detail || {};
        updateUI(status, label);
      });

      // Immediate check in case service already initialized
      if (window.FirebaseSync) {
        updateUI(window.FirebaseSync.status);
      }

      btn.addEventListener('click', () => {
        const syncStatus = window.FirebaseSync ? window.FirebaseSync.status : 'unknown';
        if (syncStatus === 'synced') {
          showToast('☁️ Data abadi & tersinkron di Firebase Cloud!', 'cloud_done');
        } else if (syncStatus === 'syncing') {
          showToast('Sedang menyimpan ke cloud Firebase...', 'sync');
        } else if (syncStatus === 'offline') {
          showToast('Mode offline. Data tetap tersimpan aman di perangkat lokal.', 'cloud_off');
        } else {
          showToast('Menghubungkan ke Firebase Cloud...', 'cloud');
        }
      });
    }

    // --- Top Banner & Header HUD ---
    updateBanner() {
      const totals = window.AppStore.getTotals();
      const collectedEl = document.getElementById('bannerCollectedDisplay');
      const targetEl = document.getElementById('bannerTargetDisplay');
      const pctBadge = document.getElementById('bannerPctBadge');
      const progressBar = document.getElementById('bannerProgressBar');
      const headerCollected = document.getElementById('headerCollectedDisplay');
      const headerBadgeGoal = document.getElementById('headerBadgeGoal');

      if (collectedEl) collectedEl.textContent = formatRp(totals.totalCollected);
      if (targetEl) targetEl.textContent = '/ ' + Number(totals.targetGoal).toLocaleString('id-ID');
      if (pctBadge) pctBadge.textContent = totals.pct + '% TERCAPAI';
      if (progressBar) progressBar.style.width = Math.min(100, totals.pct) + '%';
      if (headerCollected) headerCollected.textContent = formatRp(totals.totalCollected);

      if (headerBadgeGoal) {
        const jt = totals.targetGoal / 1000000;
        headerBadgeGoal.textContent = (Number.isInteger(jt) ? jt : jt.toFixed(1)) + ' Juta';
      }

      this.renderStatisticsTab();
      this.renderKantongTab();
    }

    // --- Roadmap Canvas & Dynamic SVG Spline Path System ---
    determineNodeStatuses() {
      const store = window.AppStore;
      const levels = store.levels;
      const dynamicLevels = store.dynamicLevels;

      // Ordered list of main progression levels from bottom to top
      const progressionOrder = [
        { id: 'level1', elementId: 'nodeLevel1' },
        { id: 'level2', elementId: 'nodeLevel2' },
        { id: 'level3', elementId: 'nodeLevel3' },
        { id: 'level4', elementId: 'nodeLevel4' }
      ];

      // Apex is the 1M milestone
      progressionOrder.push({ id: 'finish', elementId: 'apexNodeContainer', isApex: true });

      // Dynamic expansion levels above apex
      dynamicLevels.forEach((dl, i) => {
        progressionOrder.push({ id: dl.id, elementId: `dynamicNode_${dl.id}`, isDynamic: true, dynamicIndex: i });
      });

      // Filter non-deleted
      const activeList = progressionOrder.filter(item => {
        const lvl = store.getLevel(item.id);
        return lvl && !lvl.deleted;
      });

      // Determine statuses: scan bottom to top
      let foundActive = false;
      const statusMap = {};

      activeList.forEach(item => {
        const lvl = store.getLevel(item.id);
        const target = Number(lvl.target) || 0;
        const collected = Number(lvl.collected) || 0;
        const isDone = target > 0 && collected >= target;

        if (isDone && !foundActive) {
          statusMap[item.id] = 'done';
        } else if (!foundActive) {
          statusMap[item.id] = 'active';
          foundActive = true;
        } else {
          statusMap[item.id] = 'locked';
        }
      });

      if (!foundActive && activeList.length > 0) {
        const topItem = activeList[activeList.length - 1];
        statusMap[topItem.id] = 'active';
      }

      return { activeList, statusMap };
    }

    renderRoadmap() {
      const store = window.AppStore;
      const levels = store.levels;
      const dynamicLevels = store.dynamicLevels;

      const { activeList, statusMap } = this.determineNodeStatuses();

      // Render Dynamic Levels Container (Above Apex)
      const dynContainer = document.getElementById('dynamicNodesTopContainer');
      if (dynContainer) {
        dynContainer.innerHTML = '';
        dynamicLevels.forEach((dLevel, index) => {
          if (dLevel.deleted) return;
          const isLeft = index % 2 === 0;
          const status = statusMap[dLevel.id] || 'locked';

          // Check if this dynamic level has an attached side quest
          const attachedSQ = store.dynamicSideQuests.find(sq => sq.parentLevelId === dLevel.id && !sq.deleted);

          let iconHtml = '';
          let badgeHtml = '';
          if (status === 'done') {
            badgeHtml = `
              <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--secondary)] text-[var(--on-secondary)] flex items-center justify-center shadow-xs z-10">
                <span class="material-symbols-outlined text-[13px]">check</span>
              </div>
            `;
          } else if (status === 'locked') {
            badgeHtml = `
              <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--surface-dim)] text-[var(--outline)] flex items-center justify-center shadow-xs z-10">
                <span class="material-symbols-outlined text-[12px]">lock</span>
              </div>
            `;
          }

          if (dLevel.customImage) {
            iconHtml = `<img src="${dLevel.customImage}" alt="${dLevel.title}" class="w-full h-full rounded-full object-cover shadow-sm"/>${badgeHtml}`;
          } else {
            iconHtml = `
              <span class="material-symbols-outlined text-[26px]">${dLevel.icon || 'rocket_launch'}</span>
              <span class="absolute -top-1 -right-1 text-[16px]">${dLevel.emoji || '🚀'}</span>
              ${badgeHtml}
            `;
          }

          let circleClass = 'w-14 h-14 rounded-full flex items-center justify-center shadow-md relative border-2 overflow-hidden node-icon-wrapper ';
          if (status === 'active') {
            circleClass += 'bg-[var(--secondary)] text-[var(--on-secondary)] border-[var(--secondary-container)] animate-active-node';
          } else if (status === 'done') {
            circleClass += 'bg-[var(--primary)] text-[var(--on-primary)] border-[var(--primary-container)]';
          } else {
            circleClass += 'bg-[var(--surface-container-highest)] border-dashed border-[var(--outline-variant)] text-[var(--outline)]';
          }

          const activeBadgeHtml = status === 'active' ? `
            <div class="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--secondary)] text-[var(--on-secondary)] shadow-md animate-bounce mb-1 active-indicator-badge">
              <span class="material-symbols-outlined text-[13px]">location_on</span>
              <span class="font-label-sm text-[10px] font-bold tracking-tight">Kamu di sini</span>
            </div>
          ` : '';

          // Build side quest HTML if attached
          let sideQuestHtml = '';
          if (attachedSQ) {
            sideQuestHtml = `
              <div class="flex-1 flex ${isLeft ? 'justify-end' : 'justify-start'} items-center relative">
                <!-- Connector dotted bridge -->
                <div class="flex-grow border-t-2 border-dashed border-[var(--outline-variant)] mx-2 h-0"></div>
                <div class="flex flex-col items-center max-w-[125px] text-center cursor-pointer group active:scale-95 transition-transform relative" onclick="window.App.openLevel('${attachedSQ.id}')">
                  <div class="w-12 h-12 rounded-full bg-[var(--surface-container-highest)] border-2 border-[var(--secondary-container)] text-[var(--secondary)] flex items-center justify-center shadow-sm relative overflow-hidden node-icon-wrapper">
                    <span class="material-symbols-outlined text-[22px] node-icon">${attachedSQ.icon || 'flash_on'}</span>
                    <span class="absolute -top-1 -right-1 text-[12px]">${attachedSQ.emoji || '⚡'}</span>
                  </div>
                  <span class="px-1.5 py-0.5 rounded-full bg-[var(--secondary-container)] text-[var(--on-secondary-container)] font-label-sm text-[9px] font-bold uppercase mt-1 tracking-wider">Side Quest</span>
                  <span class="font-label-sm text-[11px] text-[var(--on-surface)] font-bold leading-tight mt-0.5 node-title">${attachedSQ.title.replace('Side Quest: ', '')}</span>
                  <span class="font-label-sm text-[10px] text-[var(--secondary)] font-semibold mt-0.5 node-amount">${formatRp(attachedSQ.collected)} / ${formatRp(attachedSQ.target)}</span>
                </div>
              </div>
            `;
          }

          const nodeCard = document.createElement('div');
          nodeCard.id = `dynamicNode_${dLevel.id}`;

          if (attachedSQ) {
            // Render as a row with side quest attached
            nodeCard.className = `relative z-10 w-full flex items-center ${isLeft ? 'justify-start pl-3 pr-3' : 'justify-end pr-3 pl-3'} mb-8 animate-float`;
            
            const mainNodeHtml = `
              <div class="flex flex-col items-center max-w-[170px] text-center cursor-pointer active:scale-95 transition-transform shrink-0" onclick="window.App.openLevel('${dLevel.id}')">
                ${activeBadgeHtml}
                <div class="${circleClass}">
                  ${iconHtml}
                </div>
                <span class="font-title-md text-[var(--on-surface)] font-bold mt-1.5 leading-tight node-title">${dLevel.title}</span>
                <span class="font-label-sm text-[var(--secondary)] font-bold mt-0.5">Target: ${formatRp(dLevel.target)}</span>
                <span class="font-label-sm text-[11px] font-semibold text-[var(--on-surface-variant)] mt-0.5">${formatRp(dLevel.collected)} terkumpul</span>
              </div>
            `;

            // Place side quest on opposite side of main node
            nodeCard.innerHTML = isLeft ? (mainNodeHtml + sideQuestHtml) : (sideQuestHtml + mainNodeHtml);
          } else {
            // Original single node layout
            nodeCard.className = `relative z-10 w-full flex ${isLeft ? 'justify-start pl-8' : 'justify-end pr-8'} mb-8 animate-float`;
            nodeCard.innerHTML = `
              <div class="flex flex-col items-center max-w-[170px] text-center cursor-pointer active:scale-95 transition-transform" onclick="window.App.openLevel('${dLevel.id}')">
                ${activeBadgeHtml}
                <div class="${circleClass}">
                  ${iconHtml}
                </div>
                <span class="font-title-md text-[var(--on-surface)] font-bold mt-1.5 leading-tight node-title">${dLevel.title}</span>
                <span class="font-label-sm text-[var(--secondary)] font-bold mt-0.5">Target: ${formatRp(dLevel.target)}</span>
                <span class="font-label-sm text-[11px] font-semibold text-[var(--on-surface-variant)] mt-0.5">${formatRp(dLevel.collected)} terkumpul</span>
              </div>
            `;
          }

          dynContainer.appendChild(nodeCard);
        });
      }

      // Render dynamic side quests attached to BASE levels (level1, level2, level4)
      // level3 already has the hardcoded sidequest node in HTML
      this.renderBaseLevelSideQuests(store);

      // Update Node 1
      this.updateNodeEl('nodeLevel1', levels.level1, statusMap['level1']);
      // Update Node 2
      this.updateNodeEl('nodeLevel2', levels.level2, statusMap['level2']);
      // Update Node 3
      this.updateNodeEl('nodeLevel3', levels.level3, statusMap['level3']);
      // Update Sidequest Node
      this.updateNodeEl('nodeSidequest', levels.sidequest, levels.sidequest && levels.sidequest.completed ? 'done' : 'normal');
      // Update Node 4
      this.updateNodeEl('nodeLevel4', levels.level4, statusMap['level4']);

      // Update activeNodeWrapper visibility
      const activeWrapper = document.getElementById('activeNodeWrapper');
      if (activeWrapper) {
        if (levels.level3.deleted && levels.sidequest.deleted) {
          activeWrapper.classList.add('hidden');
        } else {
          activeWrapper.classList.remove('hidden');
        }
      }

      // Update Apex Node (Puncak)
      const apexNode = levels.finish;
      const apexContainer = document.getElementById('apexNodeContainer');
      if (apexContainer) {
        if (apexNode.deleted) {
          apexContainer.classList.add('hidden');
        } else {
          apexContainer.classList.remove('hidden');
        }
      }

      const apexTargetLabel = document.getElementById('apexTargetLabel');
      const apexTitleLabel = document.getElementById('apexTitleLabel');
      const apexCircle = document.getElementById('apexIconCircle');
      const totals = store.getTotals();

      if (apexTargetLabel) {
        apexTargetLabel.textContent = 'Target: ' + formatRp(totals.targetGoal);
      }
      if (apexTitleLabel) {
        const jt = totals.targetGoal / 1000000;
        apexTitleLabel.textContent = `Puncak ${(Number.isInteger(jt) ? jt : jt.toFixed(1))} Juta`;
      }
      if (apexCircle) {
        if (apexNode.customImage) {
          apexCircle.innerHTML = `
            <img src="${apexNode.customImage}" class="w-full h-full rounded-full object-cover" alt="Apex"/>
            <span class="absolute -top-2 -right-1 text-[20px]" id="apexFlagIcon">🏆</span>
          `;
        } else {
          apexCircle.innerHTML = `
            <span class="material-symbols-outlined text-[36px]" style="font-variation-settings: 'FILL' 1;">workspace_premium</span>
            <span class="absolute -top-2 -right-1 text-[20px]" id="apexFlagIcon">🏆</span>
          `;
        }
      }

      // Rebuild Dynamic SVG Paths & Colors
      this.updateSvgPaths(activeList, statusMap);
      this.updateSvgColors();

      // Second-pass geometry update after layout flush
      requestAnimationFrame(() => {
        this.updateSvgPaths(activeList, statusMap);
      });

      // Keep Side Quest button state updated
      this.updateSideQuestBtnState();
    }

    updateNodeEl(elementId, levelData, status = 'normal') {
      const el = document.getElementById(elementId);
      if (!el || !levelData) return;

      if (levelData.deleted) {
        el.classList.add('hidden');
        if (el.parentElement && el.parentElement.id && el.parentElement.id.startsWith('wrapperLevel')) {
          el.parentElement.classList.add('hidden');
        }
        return;
      } else {
        el.classList.remove('hidden');
        if (el.parentElement && el.parentElement.id && el.parentElement.id.startsWith('wrapperLevel')) {
          el.parentElement.classList.remove('hidden');
        }
      }

      const titleEl = el.querySelector('.node-title');
      const subtitleEl = el.querySelector('.node-subtitle');
      const amountEl = el.querySelector('.node-amount');
      const iconWrapper = el.querySelector('.node-icon-wrapper');

      // Update Titles cleanly
      if (titleEl && subtitleEl) {
        if (levelData.title.includes(':')) {
          const parts = levelData.title.split(':');
          titleEl.textContent = parts[0].trim();
          subtitleEl.textContent = parts.slice(1).join(':').trim();
        } else {
          titleEl.textContent = levelData.title;
          subtitleEl.textContent = '';
        }
      } else if (titleEl) {
        titleEl.textContent = levelData.title;
      }

      // Update Amounts
      if (amountEl) {
        if (status === 'done' || levelData.completed) {
          amountEl.textContent = `Tuntas: ${formatRp(levelData.target)}`;
          amountEl.className = 'font-label-sm text-[10px] text-[var(--primary)] font-bold mt-0.5 node-amount';
        } else {
          amountEl.textContent = `${formatRp(levelData.collected)} / ${formatRp(levelData.target)}`;
          amountEl.className = 'font-label-sm text-[10px] text-[var(--secondary)] font-bold mt-0.5 node-amount';
        }
      }

      // Active indicator badge ("Kamu di sini")
      // Remove any existing active-indicator-badge in this element to guarantee strictly 1 badge
      const existingBadges = el.querySelectorAll('.active-indicator-badge');
      existingBadges.forEach((b) => b.remove());

      if (status === 'active') {
        const activeBadge = document.createElement('div');
        activeBadge.className = 'flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[var(--secondary)] text-[var(--on-secondary)] shadow-md animate-bounce mb-1 active-indicator-badge';
        activeBadge.innerHTML = `
          <span class="material-symbols-outlined text-[13px]">location_on</span>
          <span class="font-label-sm text-[10px] font-bold tracking-tight">Kamu di sini</span>
        `;
        const targetCard = el.classList.contains('flex-col') ? el : (el.querySelector('.flex-col') || el);
        targetCard.insertBefore(activeBadge, targetCard.firstChild);
      }

      // Active indicator ping ring
      const activePing = el.querySelector('.animate-ping');
      if (activePing) {
        activePing.classList.toggle('hidden', status !== 'active');
      }

      // Update Icon Circle & Badge
      if (iconWrapper) {
        // Base classes
        iconWrapper.className = 'rounded-full flex items-center justify-center shadow-md relative overflow-hidden node-icon-wrapper';
        
        let circleSizeClass = 'w-14 h-14';
        let bgStyleClass = '';

        if (status === 'active') {
          circleSizeClass = 'w-16 h-16';
          bgStyleClass = 'bg-[var(--secondary)] text-[var(--on-secondary)] border-2 border-[var(--secondary-container)] animate-active-node';
        } else if (status === 'done' || levelData.completed) {
          circleSizeClass = 'w-14 h-14';
          bgStyleClass = 'bg-[var(--primary)] text-[var(--on-primary)] border-2 border-[var(--primary-container)]';
        } else {
          circleSizeClass = 'w-14 h-14';
          bgStyleClass = 'bg-[var(--surface-container-highest)] border-2 border-dashed border-[var(--outline-variant)] text-[var(--outline)]';
        }

        iconWrapper.classList.add(...circleSizeClass.split(' '), ...bgStyleClass.split(' '));

        let badgeHtml = '';
        if (status === 'done' || levelData.completed) {
          badgeHtml = `
            <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--secondary)] text-[var(--on-secondary)] flex items-center justify-center shadow-xs z-10">
              <span class="material-symbols-outlined text-[13px]">check</span>
            </div>
          `;
        } else if (status === 'locked') {
          badgeHtml = `
            <div class="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--surface-dim)] text-[var(--outline)] flex items-center justify-center shadow-xs z-10">
              <span class="material-symbols-outlined text-[12px]">lock</span>
            </div>
          `;
        }

        if (levelData.customImage) {
          iconWrapper.innerHTML = `
            <img src="${levelData.customImage}" alt="${levelData.title}" class="w-full h-full rounded-full object-cover shadow-sm"/>
            ${badgeHtml}
          `;
        } else {
          const iconSymbol = levelData.icon || 'star';
          const emojiSymbol = levelData.emoji || '';
          iconWrapper.innerHTML = `
            <span class="material-symbols-outlined text-[26px] node-icon" ${status === 'active' ? `style="font-variation-settings: 'FILL' 1;"` : ''}>${iconSymbol}</span>
            ${emojiSymbol ? `<span class="absolute -top-1 -right-1 text-[13px]">${emojiSymbol}</span>` : ''}
            ${badgeHtml}
          `;
        }
      }
    }

    updateSvgPaths(activeListParam, statusMapParam) {
      const svg = document.getElementById('progressionSvg');
      const container = document.getElementById('progressionPathContainer');
      const solidPath = document.getElementById('svgSolidPath');
      const dottedPath = document.getElementById('svgDottedPath');

      if (!svg || !container) return;

      const containerRect = container.getBoundingClientRect();
      const containerWidth = container.offsetWidth || 360;
      const containerHeight = Math.max(840, container.offsetHeight);

      svg.setAttribute('viewBox', `0 0 ${containerWidth} ${containerHeight}`);

      const { activeList, statusMap } = (activeListParam && statusMapParam) 
        ? { activeList: activeListParam, statusMap: statusMapParam }
        : this.determineNodeStatuses();

      // Gather coordinates of visible nodes on progression path
      const points = [];
      activeList.forEach(item => {
        const el = document.getElementById(item.elementId);
        if (!el || el.classList.contains('hidden')) return;
        const circle = el.querySelector('.node-icon-wrapper') || el.querySelector('#apexIconCircle') || el;
        const rect = circle.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          points.push({
            id: item.id,
            status: statusMap[item.id] || 'locked',
            x: rect.left + rect.width / 2 - containerRect.left,
            y: rect.top + rect.height / 2 - containerRect.top
          });
        }
      });

      // Sort points from bottom to top (decreasing y coordinate)
      points.sort((a, b) => b.y - a.y);

      if (points.length < 2) {
        if (solidPath) solidPath.setAttribute('d', '');
        if (dottedPath) dottedPath.setAttribute('d', '');
        return;
      }

      // Find index of the active node
      let activeIndex = points.findIndex(p => p.status === 'active');
      if (activeIndex === -1) {
        // If all completed, activeIndex is the top node
        activeIndex = points.length - 1;
      }

      // Build Solid Path (from points[0] up to points[activeIndex])
      let solidD = '';
      if (activeIndex > 0) {
        solidD = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
        for (let i = 0; i < activeIndex; i++) {
          const p0 = points[i];
          const p1 = points[i + 1];
          const ym = ((p0.y + p1.y) / 2).toFixed(1);
          solidD += ` C ${p0.x.toFixed(1)} ${ym}, ${p1.x.toFixed(1)} ${ym}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
        }
      }

      // Build Dotted Path (from points[activeIndex] up to points[points.length - 1])
      let dottedD = '';
      if (activeIndex < points.length - 1) {
        dottedD = `M ${points[activeIndex].x.toFixed(1)} ${points[activeIndex].y.toFixed(1)}`;
        for (let i = activeIndex; i < points.length - 1; i++) {
          const p0 = points[i];
          const p1 = points[i + 1];
          const ym = ((p0.y + p1.y) / 2).toFixed(1);
          dottedD += ` C ${p0.x.toFixed(1)} ${ym}, ${p1.x.toFixed(1)} ${ym}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
        }
      }

      if (solidPath) solidPath.setAttribute('d', solidD);
      if (dottedPath) dottedPath.setAttribute('d', dottedD);
    }

    updateSvgColors() {
      const theme = window.ThemeEngine.getCurrentTheme();
      if (!theme) return;
      const solidPath = document.getElementById('svgSolidPath');
      const dottedPath = document.getElementById('svgDottedPath');

      if (solidPath) {
        solidPath.setAttribute('stroke', theme.vars['--path-solid'] || theme.vars['--primary']);
      }
      if (dottedPath) {
        dottedPath.setAttribute('stroke', theme.vars['--path-dotted'] || theme.vars['--outline-variant']);
      }
    }

    /**
     * Render dynamic side quest nodes attached to base levels (level1, level2, level4).
     * level3's sidequest is hardcoded in HTML. For other base levels with dynamic side quests,
     * we inject a side quest node container near the parent node.
     */
    renderBaseLevelSideQuests(store) {
      const baseLevelConfigs = [
        { id: 'level1', wrapperId: 'wrapperLevel1', nodeId: 'nodeLevel1' },
        { id: 'level2', wrapperId: 'wrapperLevel2', nodeId: 'nodeLevel2' },
        { id: 'level4', wrapperId: 'wrapperLevel4', nodeId: 'nodeLevel4' },
      ];

      baseLevelConfigs.forEach(config => {
        const wrapper = document.getElementById(config.wrapperId);
        const existingSQ = document.getElementById(`dynamicSQ_${config.id}`);
        if (existingSQ) existingSQ.remove();

        if (!wrapper) return;

        const sq = store.dynamicSideQuests.find(s => s.parentLevelId === config.id && !s.deleted);

        if (!sq) {
          // Reset wrapper classes to default single-node state
          if (config.id === 'level1') {
            wrapper.className = 'relative z-10 flex flex-col items-center text-center mt-2';
          } else {
            wrapper.className = 'relative z-10 w-full flex justify-start pl-8 mb-8';
          }
          return;
        }

        // Adjust wrapper classes for side-by-side row
        if (config.id === 'level1') {
          wrapper.className = 'relative z-10 w-full flex items-center justify-center pl-3 pr-3 mt-2';
        } else {
          wrapper.className = 'relative z-10 w-full flex items-center justify-start pl-3 pr-3 mb-8';
        }

        const sqContainer = document.createElement('div');
        sqContainer.id = `dynamicSQ_${config.id}`;
        sqContainer.className = 'flex-1 flex justify-end items-center relative';
        sqContainer.innerHTML = `
          <!-- Connector dotted bridge -->
          <div class="flex-grow border-t-2 border-dashed border-[var(--outline-variant)] mx-2 h-0"></div>
          <div class="flex flex-col items-center max-w-[125px] text-center cursor-pointer group active:scale-95 transition-transform relative shrink-0" onclick="window.App.openLevel('${sq.id}')">
            <div class="w-12 h-12 rounded-full bg-[var(--surface-container-highest)] border-2 border-[var(--secondary-container)] text-[var(--secondary)] flex items-center justify-center shadow-sm relative overflow-hidden node-icon-wrapper">
              <span class="material-symbols-outlined text-[22px] node-icon">${sq.icon || 'flash_on'}</span>
              <span class="absolute -top-1 -right-1 text-[12px]">${sq.emoji || '⚡'}</span>
            </div>
            <span class="px-1.5 py-0.5 rounded-full bg-[var(--secondary-container)] text-[var(--on-secondary-container)] font-label-sm text-[9px] font-bold uppercase mt-1 tracking-wider">Side Quest</span>
            <span class="font-label-sm text-[11px] text-[var(--on-surface)] font-bold leading-tight mt-0.5 node-title">${sq.title.replace('Side Quest: ', '')}</span>
            <span class="font-label-sm text-[10px] text-[var(--secondary)] font-semibold mt-0.5 node-amount">${formatRp(sq.collected)} / ${formatRp(sq.target)}</span>
          </div>
        `;

        wrapper.appendChild(sqContainer);
      });
    }

    // --- Universal Level & Quest Detail Bottom Sheet ---
    setDepositMode(mode) {
      this.depositMode = mode === 'subtract' ? 'subtract' : 'add';
      const modeAddBtn = document.getElementById('modeAddBtn');
      const modeSubBtn = document.getElementById('modeSubBtn');
      const prefix = document.getElementById('depositSignPrefix');
      const input = document.getElementById('universalDepositInput');
      const helper = document.getElementById('depositModeHelper');
      const submitBtn = document.getElementById('universalSubmitDepositBtn');
      const submitIcon = document.getElementById('submitDepositIcon');
      const submitText = document.getElementById('submitDepositText');
      const presetBtns = document.querySelectorAll('.universal-preset-btn');

      if (this.depositMode === 'add') {
        if (modeAddBtn) {
          modeAddBtn.className = 'px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 bg-primary text-on-primary shadow-xs';
        }
        if (modeSubBtn) {
          modeSubBtn.className = 'px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 text-on-surface-variant hover:text-on-surface';
        }
        if (prefix) {
          prefix.textContent = '+ Rp';
          prefix.className = 'absolute left-3.5 top-1/2 -translate-y-1/2 font-title-md text-sm font-bold text-primary transition-colors select-none';
        }
        if (input) {
          input.classList.remove('focus:border-error');
          input.classList.add('focus:border-primary');
        }
        if (helper) helper.classList.add('hidden');
        if (submitBtn) {
          submitBtn.className = 'btn-tactile btn-primary-tactile w-full h-12 mt-1 gap-2 text-sm transition-all';
        }
        if (submitIcon) submitIcon.textContent = 'add_task';
        if (submitText) submitText.textContent = 'Simpan Tambah Tabungan';

        presetBtns.forEach((b) => {
          const val = b.getAttribute('data-val');
          b.textContent = `+Rp ${Number(val).toLocaleString('id-ID')}`;
        });
      } else {
        if (modeAddBtn) {
          modeAddBtn.className = 'px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 text-on-surface-variant hover:text-on-surface';
        }
        if (modeSubBtn) {
          modeSubBtn.className = 'px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 bg-error text-on-error shadow-xs';
        }
        if (prefix) {
          prefix.textContent = '− Rp';
          prefix.className = 'absolute left-3.5 top-1/2 -translate-y-1/2 font-title-md text-sm font-bold text-error transition-colors select-none';
        }
        if (input) {
          input.classList.remove('focus:border-primary');
          input.classList.add('focus:border-error');
        }
        if (helper) helper.classList.remove('hidden');
        if (submitBtn) {
          submitBtn.className = 'btn-tactile btn-error-tactile w-full h-12 mt-1 gap-2 text-sm transition-all';
        }
        if (submitIcon) submitIcon.textContent = 'remove_circle_outline';
        if (submitText) submitText.textContent = 'Simpan Pengurangan Tabungan';

        presetBtns.forEach((b) => {
          const val = b.getAttribute('data-val');
          b.textContent = `-Rp ${Number(val).toLocaleString('id-ID')}`;
        });
      }
    }

    initUniversalSheet() {
      const backdrop = document.getElementById('universalSheetBackdrop');
      const closeBtn = document.getElementById('closeUniversalSheetBtn');
      const saveGuideBtn = document.getElementById('saveGuideBtn');
      const submitDepositBtn = document.getElementById('universalSubmitDepositBtn');
      const depositInput = document.getElementById('universalDepositInput');
      const editBtn = document.getElementById('openEditLevelModalBtn');
      const sheetTitle = document.getElementById('sheetTitle');
      const modeAddBtn = document.getElementById('modeAddBtn');
      const modeSubBtn = document.getElementById('modeSubBtn');

      if (closeBtn) closeBtn.addEventListener('click', () => this.closeUniversalSheet());
      if (backdrop) {
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) this.closeUniversalSheet();
        });
      }

      // Auto-grow guide textarea on input
      const guideTextarea = document.getElementById('levelGuideText');
      if (guideTextarea) {
        guideTextarea.addEventListener('input', () => autoGrowTextarea(guideTextarea));
      }

      // Mode toggle buttons (+ / -)
      if (modeAddBtn) modeAddBtn.addEventListener('click', () => this.setDepositMode('add'));
      if (modeSubBtn) modeSubBtn.addEventListener('click', () => this.setDepositMode('subtract'));

      // Tap Edit button or Tap sheet title to open Edit Modal
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          if (this.currentOpenLevelId) {
            this.openEditLevelModal(this.currentOpenLevelId);
          }
        });
      }
      if (sheetTitle) {
        sheetTitle.addEventListener('click', () => {
          if (this.currentOpenLevelId) {
            this.openEditLevelModal(this.currentOpenLevelId);
          }
        });
      }

      // In-place editable Quest Guide save
      if (saveGuideBtn) {
        saveGuideBtn.addEventListener('click', () => {
          if (!this.currentOpenLevelId) return;
          const text = document.getElementById('levelGuideText').value.trim();
          window.AppStore.saveGuide(this.currentOpenLevelId, text);
          showToast('Petunjuk level berhasil disimpan!', 'task_alt');
        });
      }

      // Quick preset buttons (+10rb, +50rb, +100rb)
      document.querySelectorAll('.universal-preset-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const val = Number(btn.getAttribute('data-val'));
          if (depositInput) {
            const current = Number(depositInput.value) || 0;
            depositInput.value = current + val;
          }
        });
      });

      // Submit deposit or withdrawal
      if (submitDepositBtn) {
        submitDepositBtn.addEventListener('click', () => {
          if (!this.currentOpenLevelId) return;
          const rawAmount = Number(depositInput.value);
          if (isNaN(rawAmount) || rawAmount === 0) {
            showToast('Masukkan nominal tabungan yang valid', 'warning');
            return;
          }

          // Support typing negative amounts or using subtract mode
          const isSubtract = this.depositMode === 'subtract' || rawAmount < 0;
          const absAmount = Math.abs(rawAmount);

          if (isSubtract) {
            const res = window.AppStore.subtractDeposit(this.currentOpenLevelId, absAmount);
            if (!res.success) {
              showToast(res.error || 'Gagal mengurangi tabungan', 'warning');
              return;
            }

            depositInput.value = '';
            this.updateBanner();
            this.renderRoadmap();
            this.populateUniversalSheet(this.currentOpenLevelId);
            showToast(`-${formatRp(res.deducted)} berhasil dikurangi dari ${res.level.title}!`, 'trending_down');
          } else {
            const res = window.AppStore.addDeposit(this.currentOpenLevelId, absAmount);
            if (!res.success) {
              showToast(res.error || 'Gagal menambah tabungan', 'warning');
              return;
            }

            depositInput.value = '';
            this.updateBanner();
            this.renderRoadmap();
            this.populateUniversalSheet(this.currentOpenLevelId);
            showToast(`+${formatRp(absAmount)} berhasil disimpan ke ${res.level.title}!`, 'savings');

            if (res.level.completed) {
              fireConfetti();
              showToast(`🎉 Selamat! ${res.level.title} telah tuntas!`, 'celebration');
            }
          }
        });
      }
    }

    openLevel(levelId) {
      this.currentOpenLevelId = levelId;
      this.setDepositMode('add');
      const depositInput = document.getElementById('universalDepositInput');
      if (depositInput) depositInput.value = '';
      this.populateUniversalSheet(levelId);

      const backdrop = document.getElementById('universalSheetBackdrop');
      if (backdrop) {
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }

    closeUniversalSheet() {
      const backdrop = document.getElementById('universalSheetBackdrop');
      if (backdrop) {
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
      this.currentOpenLevelId = null;
    }

    populateUniversalSheet(levelId) {
      const level = window.AppStore.getLevel(levelId);
      if (!level) return;

      const titleEl = document.getElementById('sheetTitle');
      const badgeEl = document.getElementById('sheetBadge');
      const iconContainer = document.getElementById('sheetIconContainer');
      const guideText = document.getElementById('levelGuideText');
      const fractionEl = document.getElementById('sheetAmountFraction');
      const progressBar = document.getElementById('sheetProgressBar');
      const targetVal = document.getElementById('sheetTargetValue');
      const remVal = document.getElementById('sheetRemainingValue');
      const remLabel = document.getElementById('sheetRemainingLabel');

      if (titleEl) titleEl.textContent = level.title;
      if (badgeEl) badgeEl.textContent = level.badge || (level.completed ? 'Level Tuntas' : 'Misi Berjalan');

      if (iconContainer) {
        if (level.customImage) {
          iconContainer.innerHTML = `<img src="${level.customImage}" class="w-full h-full object-cover rounded-full" alt="Icon">`;
        } else {
          iconContainer.innerHTML = `<span class="material-symbols-outlined text-[26px]">${level.icon || 'business_center'}</span>`;
        }
      }

      if (guideText) {
        guideText.value = level.guide || '';
        // Trigger auto-grow after setting value
        autoGrowTextarea(guideText);
      }

      const target = Number(level.target) || 1;
      const collected = Number(level.collected) || 0;
      const pct = Math.min(100, Math.round((collected / target) * 100));
      const remaining = Math.max(0, target - collected);

      if (fractionEl) fractionEl.textContent = `${formatRp(collected)} / ${formatRp(target)}`;
      if (progressBar) progressBar.style.width = pct + '%';
      if (targetVal) targetVal.textContent = formatRp(target);
      if (remVal) {
        remVal.textContent = formatRp(remaining);
        remVal.className = remaining === 0 ? 'font-title-md text-sm text-[var(--primary)] font-bold' : 'font-title-md text-sm text-[var(--error)] font-bold';
      }
      if (remLabel) {
        remLabel.textContent = remaining === 0 ? 'Status' : 'Sisa Kekurangan';
      }
    }

    // --- EDIT LEVEL MODAL (Bug 1, 2, 3, 4 fixes) ---
    initEditLevelModal() {
      const backdrop = document.getElementById('editLevelModalBackdrop');
      const closeBtn = document.getElementById('closeEditLevelModalBtn');
      const saveBtn = document.getElementById('saveEditLevelBtn');
      const deleteBtn = document.getElementById('deleteLevelBtn');
      const triggerUploadBtn = document.getElementById('triggerUploadImageBtn');
      const fileInput = document.getElementById('editLevelFileInput');
      const removeImgBtn = document.getElementById('removeCustomImageBtn');
      const previewBox = document.getElementById('editLevelImagePreview');

      if (closeBtn) closeBtn.addEventListener('click', () => this.closeEditLevelModal());
      if (backdrop) {
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) this.closeEditLevelModal();
        });
      }

      // Trigger file selector
      if (triggerUploadBtn && fileInput) {
        triggerUploadBtn.addEventListener('click', () => fileInput.click());
      }
      if (previewBox && fileInput) {
        previewBox.addEventListener('click', () => fileInput.click());
      }

      // Handle Image File Upload (Base64 + Circle Crop Preview)
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          compressImage(file, (base64) => {
            this.tempEditImage = base64;
            this.updateEditImagePreview(base64);
            showToast('Gambar kustom berhasil dimuat!', 'image');
          });
        });
      }

      // Remove custom image
      if (removeImgBtn) {
        removeImgBtn.addEventListener('click', () => {
          this.tempEditImage = null;
          this.updateEditImagePreview(null);
          showToast('Foto kustom dihapus, menggunakan ikon bawaan', 'info');
        });
      }

      // Select fallback emoji
      document.querySelectorAll('.select-edit-emoji-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.select-edit-emoji-btn').forEach((b) => {
            b.classList.remove('border-2', 'border-[var(--secondary)]', 'scale-105');
            b.classList.add('border-[var(--outline-variant)]');
          });
          btn.classList.add('border-2', 'border-[var(--secondary)]', 'scale-105');
          this.selectedEmoji = btn.getAttribute('data-emoji') || '💼';
          this.selectedIcon = btn.getAttribute('data-icon') || 'business_center';
        });
      });

      // Save Level Edits (Title, Target, Custom Image, Icon)
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          if (!this.editingLevelId) return;

          const titleInput = document.getElementById('editLevelTitleInput');
          const targetInput = document.getElementById('editLevelTargetInput');

          const newTitle = titleInput ? titleInput.value.trim() : '';
          const newTarget = targetInput ? Number(targetInput.value) : 0;

          if (!newTitle) {
            showToast('Nama level tidak boleh kosong!', 'warning');
            return;
          }

          // Save to AppStore
          const res = window.AppStore.updateLevel(this.editingLevelId, {
            title: newTitle,
            target: newTarget,
            customImage: this.tempEditImage,
            icon: this.selectedIcon,
            emoji: this.selectedEmoji
          });

          if (res.success) {
            this.closeEditLevelModal();
            this.updateBanner();
            this.renderRoadmap();
            if (this.currentOpenLevelId === this.editingLevelId) {
              this.populateUniversalSheet(this.editingLevelId);
            }
            showToast(`Perubahan level "${newTitle}" berhasil disimpan!`, 'check_circle');
          }
        });
      }

      // Delete Level (Bug 2 Fix)
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
          if (!this.editingLevelId) return;

          const level = window.AppStore.getLevel(this.editingLevelId);
          const levelName = level ? level.title : 'Level';

          if (confirm(`Apakah Anda yakin ingin menghapus "${levelName}"? Urutan level lain akan otomatis tersambung kembali.`)) {
            const res = window.AppStore.deleteLevel(this.editingLevelId);
            if (res.success) {
              this.closeEditLevelModal();
              this.closeUniversalSheet();
              this.updateBanner();
              this.renderRoadmap();
              showToast(`Level "${levelName}" berhasil dihapus dari peta!`, 'delete');
            } else {
              showToast(res.error || 'Gagal menghapus level', 'error');
            }
          }
        });
      }
    }

    openEditLevelModal(levelId) {
      this.editingLevelId = levelId;
      const level = window.AppStore.getLevel(levelId);
      if (!level) return;

      const titleInput = document.getElementById('editLevelTitleInput');
      const targetInput = document.getElementById('editLevelTargetInput');
      const deleteBtn = document.getElementById('deleteLevelBtn');

      if (titleInput) titleInput.value = level.title;
      if (targetInput) targetInput.value = level.target || 0;

      // Custom image preview
      this.tempEditImage = level.customImage || null;
      this.updateEditImagePreview(this.tempEditImage);

      // Icon & Emoji
      this.selectedIcon = level.icon || 'business_center';
      this.selectedEmoji = level.emoji || '💼';

      // Delete button visibility: Show for all levels except the final apex goal
      if (deleteBtn) {
        if (level.id !== 'finish') {
          deleteBtn.classList.remove('hidden');
        } else {
          deleteBtn.classList.add('hidden');
        }
      }

      const backdrop = document.getElementById('editLevelModalBackdrop');
      if (backdrop) {
        backdrop.classList.add('active');
      }
    }

    closeEditLevelModal() {
      const backdrop = document.getElementById('editLevelModalBackdrop');
      if (backdrop) {
        backdrop.classList.remove('active');
      }
      this.editingLevelId = null;
      this.tempEditImage = null;
    }

    updateEditImagePreview(base64) {
      const placeholder = document.getElementById('editPreviewPlaceholder');
      const img = document.getElementById('editPreviewImg');
      const removeBtn = document.getElementById('removeCustomImageBtn');

      if (base64) {
        if (placeholder) placeholder.classList.add('hidden');
        if (img) {
          img.src = base64;
          img.classList.remove('hidden');
        }
        if (removeBtn) removeBtn.classList.remove('hidden');
      } else {
        if (placeholder) placeholder.classList.remove('hidden');
        if (img) {
          img.src = '';
          img.classList.add('hidden');
        }
        if (removeBtn) removeBtn.classList.add('hidden');
      }
    }

    // --- Dynamic Level Expansion Modal ---
    initAddLevelModal() {
      const triggerBtn = document.getElementById('triggerAddLevelBtn');
      const backdrop = document.getElementById('addLevelModalBackdrop');
      const closeBtn = document.getElementById('closeAddLevelModalBtn');
      const confirmBtn = document.getElementById('confirmAddLevelBtn');
      const uploadBtn = document.getElementById('triggerNewLevelUploadBtn');
      const fileInput = document.getElementById('newLevelFileInput');
      const fileNameEl = document.getElementById('newLevelFileName');

      // Side Quest elements
      const addSideQuestBtn = document.getElementById('addSideQuestBtn');
      const sideQuestFormPanel = document.getElementById('sideQuestFormPanel');
      const cancelSideQuestBtn = document.getElementById('cancelSideQuestBtn');
      const confirmSideQuestBtn = document.getElementById('confirmSideQuestBtn');

      // Track side quest icon selection separately
      this.selectedSQEmoji = '⚡';
      this.selectedSQIcon = 'flash_on';

      if (triggerBtn) triggerBtn.addEventListener('click', () => this.openAddLevelModal());
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeAddLevelModal());
      if (backdrop) {
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) this.closeAddLevelModal();
        });
      }

      if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());
      }
      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;

          compressImage(file, (base64) => {
            this.tempAddImage = base64;
            if (fileNameEl) fileNameEl.textContent = 'Foto Terpilih ✓';
            showToast('Foto kustom level berhasil dipilih!', 'image');
          });
        });
      }

      // Emoji/Icon picker buttons (for main level)
      document.querySelectorAll('.select-emoji-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.select-emoji-btn').forEach((b) => {
            b.classList.remove('border-2', 'border-[var(--secondary)]', 'scale-105');
            b.classList.add('border', 'border-[var(--outline-variant)]');
          });
          btn.classList.add('border-2', 'border-[var(--secondary)]', 'scale-105');
          btn.classList.remove('border-[var(--outline-variant)]');
          this.selectedEmoji = btn.getAttribute('data-emoji') || '🚀';
          this.selectedIcon = btn.getAttribute('data-icon') || 'rocket_launch';
        });
      });

      // Emoji/Icon picker buttons (for side quest)
      document.querySelectorAll('.select-sq-emoji-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          document.querySelectorAll('.select-sq-emoji-btn').forEach((b) => {
            b.classList.remove('border-2', 'border-secondary', 'scale-105');
            b.classList.add('border', 'border-outline-variant/40');
          });
          btn.classList.add('border-2', 'border-secondary', 'scale-105');
          btn.classList.remove('border', 'border-outline-variant/40');
          this.selectedSQEmoji = btn.getAttribute('data-sq-emoji') || '⚡';
          this.selectedSQIcon = btn.getAttribute('data-sq-icon') || 'flash_on';
        });
      });

      // Add Side Quest button - show sub-form
      if (addSideQuestBtn) {
        addSideQuestBtn.addEventListener('click', () => {
          if (addSideQuestBtn.disabled) return;
          if (sideQuestFormPanel) {
            sideQuestFormPanel.classList.remove('hidden');
            // Show which parent level will receive the side quest
            const parent = window.AppStore.getFirstAvailableSideQuestParent();
            const infoEl = document.getElementById('sideQuestParentInfo');
            if (infoEl && parent) {
              infoEl.textContent = `Side quest ini akan ditautkan ke "${parent.title}" yang belum memiliki side quest.`;
            }
          }
        });
      }

      // Cancel side quest form
      if (cancelSideQuestBtn) {
        cancelSideQuestBtn.addEventListener('click', () => {
          if (sideQuestFormPanel) sideQuestFormPanel.classList.add('hidden');
        });
      }

      // Confirm adding side quest
      if (confirmSideQuestBtn) {
        confirmSideQuestBtn.addEventListener('click', () => {
          const nameInput = document.getElementById('newSideQuestNameInput');
          const targetInput = document.getElementById('newSideQuestTargetInput');

          const name = nameInput ? nameInput.value.trim() : '';
          const target = targetInput ? Number(targetInput.value) : 100000;

          if (!name) {
            showToast('Beri nama untuk side quest baru!', 'warning');
            return;
          }

          const res = window.AppStore.addDynamicSideQuest({
            name,
            target,
            emoji: this.selectedSQEmoji,
            icon: this.selectedSQIcon,
            guide: `Selesaikan side quest "${name}" dengan target ${formatRp(target)} untuk bonus pencapaian!`
          });

          if (!res.success) {
            showToast(res.error || 'Gagal menambah side quest', 'warning');
            return;
          }

          // Hide form and close modal
          if (sideQuestFormPanel) sideQuestFormPanel.classList.add('hidden');
          this.closeAddLevelModal();
          this.updateBanner();
          this.renderRoadmap();
          showToast(`Side Quest "${res.sideQuest.title}" berhasil ditambahkan ke ${res.parent.title}!`, 'auto_awesome');
        });
      }

      // Confirm adding main level (original behavior preserved)
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          const nameInput = document.getElementById('newLevelNameInput');
          const targetInput = document.getElementById('newLevelTargetInput');

          const name = nameInput ? nameInput.value.trim() : '';
          const target = targetInput ? Number(targetInput.value) : 500000;

          if (!name) {
            showToast('Beri nama untuk level ekspansi baru!', 'warning');
            return;
          }

          const newLevel = window.AppStore.addDynamicLevel({
            name,
            target,
            emoji: this.selectedEmoji,
            icon: this.selectedIcon,
            customImage: this.tempAddImage,
            guide: `Fokus eksekusi target ${name} sebesar ${formatRp(target)} untuk melompati milestone berikutnya!`
          });

          this.closeAddLevelModal();
          this.updateBanner();
          this.renderRoadmap();
          fireConfetti();
          showToast(`Level baru "${newLevel.title}" berhasil diaktifkan!`, 'auto_awesome');
        });
      }
    }

    /**
     * Update the enabled/disabled state of the "+ Tambah Side Quest" button
     * based on whether there are available side quest slots.
     */
    updateSideQuestBtnState() {
      const btn = document.getElementById('addSideQuestBtn');
      if (!btn) return;

      const hasSlot = window.AppStore.hasAvailableSideQuestSlot();
      btn.disabled = !hasSlot;

      if (hasSlot) {
        btn.classList.remove('opacity-50', 'cursor-not-allowed');
        btn.classList.add('hover:bg-secondary', 'hover:text-on-secondary');
        btn.title = 'Tambah side quest ke level utama yang belum memiliki side quest';
      } else {
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        btn.classList.remove('hover:bg-secondary', 'hover:text-on-secondary');
        btn.title = 'Semua level utama sudah memiliki side quest. Tambah level utama baru terlebih dahulu.';
      }
    }

    openAddLevelModal() {
      this.tempAddImage = null;
      const fileNameEl = document.getElementById('newLevelFileName');
      if (fileNameEl) fileNameEl.textContent = 'Default Emoji';

      // Hide side quest form when opening modal
      const sideQuestFormPanel = document.getElementById('sideQuestFormPanel');
      if (sideQuestFormPanel) sideQuestFormPanel.classList.add('hidden');

      // Update side quest button state
      this.updateSideQuestBtnState();

      const backdrop = document.getElementById('addLevelModalBackdrop');
      if (backdrop) {
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }

    closeAddLevelModal() {
      const backdrop = document.getElementById('addLevelModalBackdrop');
      if (backdrop) {
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
      this.tempAddImage = null;

      // Also hide side quest form
      const sideQuestFormPanel = document.getElementById('sideQuestFormPanel');
      if (sideQuestFormPanel) sideQuestFormPanel.classList.add('hidden');
    }

    // --- Tas Harta (Inventaris Mesin Uang) ---
    initTasHarta() {
      const btn = document.getElementById('tasHartaBtn');
      const backdrop = document.getElementById('tasHartaBackdrop');
      const closeBtn = document.getElementById('closeTasHartaBtn');
      const openAddFormBtn = document.getElementById('openAddAssetFormBtn');
      const addPanel = document.getElementById('addAssetFormPanel');
      const cancelAddBtn = document.getElementById('cancelAddAssetBtn');
      const confirmAddBtn = document.getElementById('confirmAddAssetBtn');

      if (btn) btn.addEventListener('click', () => this.openTasHarta());
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeTasHarta());
      if (backdrop) {
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) this.closeTasHarta();
        });
      }

      if (openAddFormBtn && addPanel) {
        openAddFormBtn.addEventListener('click', () => {
          addPanel.classList.remove('hidden');
          const nameInput = document.getElementById('inputNewAssetName');
          if (nameInput) nameInput.focus();
        });
      }

      if (cancelAddBtn && addPanel) {
        cancelAddBtn.addEventListener('click', () => {
          addPanel.classList.add('hidden');
        });
      }

      if (confirmAddBtn) {
        confirmAddBtn.addEventListener('click', () => {
          const nameInput = document.getElementById('inputNewAssetName');
          const statusInput = document.getElementById('inputNewAssetStatus');
          const revInput = document.getElementById('inputNewAssetRevenue');

          const name = nameInput ? nameInput.value.trim() : '';
          const status = statusInput ? statusInput.value : 'Aktif';
          const revenue = revInput && revInput.value.trim() ? revInput.value.trim() : 'Rp 150.000 / bln';

          if (!name) {
            showToast('Silakan isi nama mesin uang / aset', 'warning');
            return;
          }

          window.AppStore.addAsset({
            name,
            status,
            revenue,
            type: 'Sumber Penghasilan',
            icon: status === 'Aktif' ? 'storefront' : 'build'
          });

          if (nameInput) nameInput.value = '';
          if (revInput) revInput.value = '';
          if (addPanel) addPanel.classList.add('hidden');

          this.renderTasHartaList();
          showToast(`Mesin uang "${name}" berhasil ditambahkan!`, 'work');
        });
      }
    }

    openTasHarta() {
      this.renderTasHartaList();
      const backdrop = document.getElementById('tasHartaBackdrop');
      if (backdrop) {
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }

    closeTasHarta() {
      const backdrop = document.getElementById('tasHartaBackdrop');
      if (backdrop) {
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    renderTasHartaList() {
      const assets = window.AppStore.assets;
      const listContainer = document.getElementById('assetListContainer');
      const countEl = document.getElementById('activeAssetsCount');

      if (countEl) countEl.textContent = `${assets.length} Aset Mesin Uang`;
      if (!listContainer) return;

      listContainer.innerHTML = '';
      assets.forEach((asset) => {
        const isAktif = asset.status === 'Aktif';
        const card = document.createElement('div');
        card.className = 'p-3.5 rounded-2xl bg-[var(--surface-container)] border border-[var(--outline-variant)] flex items-center justify-between gap-3 shadow-sm hover:shadow transition-shadow';
        card.innerHTML = `
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              isAktif ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'bg-[var(--surface-container-high)] text-[var(--on-surface-variant)]'
            }">
              <span class="material-symbols-outlined text-[20px]">${isAktif ? 'check_circle' : 'pending'}</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-title-md text-[var(--on-surface)] font-bold truncate leading-tight">${asset.name}</span>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${
                  isAktif ? 'bg-[var(--primary-fixed)] text-[var(--on-primary-fixed)]' : 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]'
                }">
                  ${asset.status}
                </span>
                <span class="font-label-sm text-[11px] text-[var(--secondary)] font-semibold">${asset.revenue}</span>
              </div>
            </div>
          </div>
          <button class="w-8 h-8 rounded-full flex items-center justify-center text-[var(--on-surface-variant)] hover:text-[var(--error)] active:scale-95 transition-colors shrink-0" onclick="window.App.deleteAssetItem('${asset.id}')" title="Hapus Aset">
            <span class="material-symbols-outlined text-[18px]">delete</span>
          </button>
        `;
        listContainer.appendChild(card);
      });
    }

    deleteAssetItem(assetId) {
      if (confirm('Apakah Anda yakin ingin menghapus aset ini dari Tas Harta?')) {
        window.AppStore.deleteAsset(assetId);
        this.renderTasHartaList();
        showToast('Aset berhasil dihapus', 'delete');
      }
    }

    // --- Theme Switcher Modal ---
    initThemeSwitcher() {
      const btn = document.getElementById('themeSwitcherBtn');
      const backdrop = document.getElementById('themeModalBackdrop');
      const closeBtn = document.getElementById('closeThemeModalBtn');

      if (btn) btn.addEventListener('click', () => this.openThemeModal());
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeThemeModal());
      if (backdrop) {
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) this.closeThemeModal();
        });
      }

      this.renderThemeOptions();
    }

    openThemeModal() {
      this.renderThemeOptions();
      const backdrop = document.getElementById('themeModalBackdrop');
      if (backdrop) {
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }

    closeThemeModal() {
      const backdrop = document.getElementById('themeModalBackdrop');
      if (backdrop) {
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    renderThemeOptions() {
      const container = document.getElementById('themeOptionsContainer');
      if (!container) return;

      const themes = window.ThemeEngine.getAllThemes();
      const current = window.ThemeEngine.currentTheme;

      container.innerHTML = '';
      themes.forEach((t) => {
        const isActive = t.id === current;
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `w-full p-3.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-all theme-card-btn ${
          isActive
            ? 'active-theme bg-[var(--surface-container-high)] ring-2 ring-[var(--primary)]'
            : 'bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)]'
        }`;
        card.innerHTML = `
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-11 h-11 rounded-full flex items-center justify-center shrink-0 shadow-inner border border-black/10" style="background-color: ${t.preview.bg};">
              <div class="flex gap-0.5">
                <span class="w-3.5 h-3.5 rounded-full shadow-sm" style="background-color: ${t.preview.primary};"></span>
                <span class="w-3.5 h-3.5 rounded-full shadow-sm" style="background-color: ${t.preview.secondary};"></span>
              </div>
            </div>
            <div class="flex flex-col min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-title-md text-[var(--on-surface)] font-bold">${t.name}</span>
                <span class="font-label-sm text-[10px] px-2 py-0.2 rounded-full bg-[var(--surface-container-highest)] text-[var(--on-surface-variant)]">${t.badge}</span>
              </div>
              <span class="font-body-sm text-[11px] text-[var(--on-surface-variant)] mt-0.5 line-clamp-1">${t.description}</span>
            </div>
          </div>
          <div class="w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
            isActive ? 'bg-[var(--primary)] text-[var(--on-primary)]' : 'text-transparent'
          }">
            <span class="material-symbols-outlined text-[18px]">check</span>
          </div>
        `;
        card.addEventListener('click', () => {
          window.ThemeEngine.applyTheme(t.id);
          this.renderThemeOptions();
          showToast(`Tema diganti ke: ${t.name}`, 'palette');
          setTimeout(() => this.closeThemeModal(), 250);
        });
        container.appendChild(card);
      });
    }

    // --- Info Modal ---
    initInfoModal() {
      const btn = document.getElementById('infoMenuBtn');
      const backdrop = document.getElementById('infoModalBackdrop');
      const closeBtn = document.getElementById('closeInfoBtn');
      const dismissBtn = document.getElementById('dismissInfoBtn');

      if (btn) btn.addEventListener('click', () => this.openInfoModal());
      if (closeBtn) closeBtn.addEventListener('click', () => this.closeInfoModal());
      if (dismissBtn) dismissBtn.addEventListener('click', () => this.closeInfoModal());
      if (backdrop) {
        backdrop.addEventListener('click', (e) => {
          if (e.target === backdrop) this.closeInfoModal();
        });
      }
    }

    openInfoModal() {
      const backdrop = document.getElementById('infoModalBackdrop');
      if (backdrop) {
        backdrop.classList.add('active');
        document.body.style.overflow = 'hidden';
      }
    }

    closeInfoModal() {
      const backdrop = document.getElementById('infoModalBackdrop');
      if (backdrop) {
        backdrop.classList.remove('active');
        document.body.style.overflow = '';
      }
    }

    // --- Multi-Tab Navigation ---
    initTabs() {
      const navLinks = document.querySelectorAll('nav a[data-path]');
      navLinks.forEach((link) => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const targetPath = link.getAttribute('data-path');
          this.switchTab(targetPath);
        });
      });
    }

    switchTab(tabKey) {
      this.activeTab = tabKey;
      const navLinks = document.querySelectorAll('nav a[data-path]');
      navLinks.forEach((link) => {
        const path = link.getAttribute('data-path');
        if (path === tabKey) {
          link.className = 'flex flex-col items-center justify-center gap-1 w-20 h-12 transition-colors text-[var(--primary)] font-bold';
        } else {
          link.className = 'flex flex-col items-center justify-center gap-1 w-20 h-12 text-[var(--on-surface-variant)] transition-colors font-medium';
        }
      });

      const tabPeta = document.getElementById('tabPetaLevel');
      const tabStats = document.getElementById('tabStatistik');
      const tabKantong = document.getElementById('tabKantong');

      if (tabPeta) tabPeta.classList.toggle('hidden', tabKey !== 'peta-level');
      if (tabStats) tabStats.classList.toggle('hidden', tabKey !== 'statistik');
      if (tabKantong) tabKantong.classList.toggle('hidden', tabKey !== 'kantong-tabungan');

      if (tabKey === 'statistik') this.renderStatisticsTab();
      if (tabKey === 'kantong-tabungan') this.renderKantongTab();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    renderStatisticsTab() {
      const statsContainer = document.getElementById('tabStatistik');
      if (!statsContainer) return;

      const totals = window.AppStore.getTotals();
      const levels = window.AppStore.levels;
      const dynamic = window.AppStore.dynamicLevels;

      const totalEl = document.getElementById('statsTotalCollected');
      const targetEl = document.getElementById('statsTotalTarget');
      const pctEl = document.getElementById('statsCompletionPct');
      const remEl = document.getElementById('statsRemaining');
      const progressEl = document.getElementById('statsProgressBar');
      const breakdownEl = document.getElementById('statsBreakdownList');

      if (totalEl) totalEl.textContent = formatRp(totals.totalCollected);
      if (targetEl) targetEl.textContent = formatRp(totals.targetGoal);
      if (pctEl) pctEl.textContent = totals.pct + '%';
      if (remEl) remEl.textContent = formatRp(totals.remaining);
      if (progressEl) progressEl.style.width = Math.min(100, totals.pct) + '%';

      if (breakdownEl) {
        breakdownEl.innerHTML = '';
        const allItems = [
          levels.level1,
          levels.level2,
          levels.level3,
          levels.sidequest,
          levels.level4,
          ...dynamic,
          ...window.AppStore.dynamicSideQuests
        ];

        allItems.forEach((l) => {
          if (!l) return;
          const p = Math.min(100, Math.round(((l.collected || 0) / (l.target || 1)) * 100));
          const row = document.createElement('div');
          row.className = 'p-3 rounded-xl bg-[var(--surface-container)] border border-[var(--outline-variant)] space-y-1.5';
          row.innerHTML = `
            <div class="flex items-center justify-between text-xs">
              <span class="font-bold text-[var(--on-surface)] truncate">${l.title}</span>
              <span class="font-semibold text-[var(--secondary)]">${formatRp(l.collected)} / ${formatRp(l.target)}</span>
            </div>
            <div class="w-full h-2 rounded-full bg-[var(--surface-container-highest)] overflow-hidden">
              <div class="h-full bg-[var(--primary)] rounded-full transition-all" style="width: ${p}%;"></div>
            </div>
          `;
          breakdownEl.appendChild(row);
        });
      }
    }

    renderKantongTab() {
      const kantongContainer = document.getElementById('tabKantong');
      if (!kantongContainer) return;

      const txList = window.AppStore.transactions;
      const listEl = document.getElementById('transactionsListContainer');
      const countEl = document.getElementById('totalTransactionsCount');

      if (countEl) countEl.textContent = `${txList.length} Mutasi Tabungan`;
      if (!listEl) return;

      listEl.innerHTML = '';
      if (txList.length === 0) {
        listEl.innerHTML = `
          <div class="p-8 text-center text-[var(--on-surface-variant)] text-sm">
            Belum ada mutasi tabungan yang tercatat.
          </div>
        `;
        return;
      }

      txList.forEach((tx) => {
        const isSubtract = tx.type === 'subtract' || tx.amount < 0;
        const absVal = Math.abs(tx.amount);
        const item = document.createElement('div');
        item.className = 'p-3.5 rounded-2xl bg-[var(--surface-container)] border border-[var(--outline-variant)] flex items-center justify-between gap-3 shadow-xs';
        item.innerHTML = `
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-full ${
              isSubtract
                ? 'bg-[var(--error-container,#ffdad6)] text-[var(--error,#ba1a1a)]'
                : 'bg-[var(--primary-fixed)] text-[var(--on-primary-fixed)]'
            } flex items-center justify-center shrink-0 font-bold">
              <span class="material-symbols-outlined text-[18px]">${isSubtract ? 'remove' : 'add'}</span>
            </div>
            <div class="flex flex-col min-w-0">
              <span class="font-title-md text-[var(--on-surface)] font-bold text-[13px] truncate leading-tight">${tx.levelTitle}</span>
              <span class="font-body-sm text-[11px] text-[var(--on-surface-variant)] mt-0.5">${tx.date} • ${tx.note}</span>
            </div>
          </div>
          <span class="font-title-md ${isSubtract ? 'text-[var(--error)]' : 'text-[var(--primary)]'} font-bold text-[14px] shrink-0">${isSubtract ? '-' : '+'}${formatRp(absVal)}</span>
        `;
        listEl.appendChild(item);
      });
    }
  }

  // Instantiate and run
  window.App = new AppController();
  document.addEventListener('DOMContentLoaded', () => {
    window.App.init();
  });
})();

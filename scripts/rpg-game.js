(() => {
  'use strict';

  const DATA_SOURCES = [
    { key: 'classes', path: 'data/rpg/classes.json' },
    { key: 'professions', path: 'data/rpg/professions.json' },
    { key: 'items', path: 'data/rpg/items.json' },
    { key: 'enemies', path: 'data/rpg/enemies.json' },
    { key: 'zones', path: 'data/rpg/zones.json' },
    { key: 'dungeons', path: 'data/rpg/dungeons.json' },
    { key: 'npcs', path: 'data/rpg/npcs.json' }
  ];

  const MAX_PROFESSIONS = 2;

  const dom = {};
  const gameData = { lookups: {} };
  const state = {
    loaded: false,
    started: false,
    player: null,
    currentZoneId: null,
    combat: null,
    currentDungeon: null,
    npcRewardsClaimed: new Set()
  };

  document.addEventListener('DOMContentLoaded', () => {
    cacheDom();
    attachEventListeners();
    loadGameData();
  });

  function cacheDom() {
    dom.classSelect = document.getElementById('class-select');
    dom.classDescription = document.getElementById('class-description');
    dom.professionOptions = document.getElementById('profession-options');
    dom.setupFeedback = document.getElementById('setup-feedback');
    dom.startButton = document.getElementById('start-button');
    dom.playerNameInput = document.getElementById('player-name');
    dom.playerInfo = document.getElementById('player-info');
    dom.inventoryInfo = document.getElementById('inventory-info');
    dom.zoneSelect = document.getElementById('zone-select');
    dom.zoneDetails = document.getElementById('zone-details');
    dom.log = document.getElementById('log');
    dom.exploreButton = document.getElementById('explore-button');
    dom.restButton = document.getElementById('rest-button');
    dom.npcControls = document.getElementById('npc-controls');
    dom.npcSelect = document.getElementById('npc-select');
    dom.talkNpcButton = document.getElementById('talk-npc-button');
    dom.dungeonControls = document.getElementById('dungeon-controls');
    dom.dungeonSelect = document.getElementById('dungeon-select');
    dom.enterDungeonButton = document.getElementById('enter-dungeon-button');
    dom.combatControls = document.getElementById('combat-controls');
    dom.abilitySelect = document.getElementById('ability-select');
    dom.abilityDescription = document.getElementById('ability-description');
    dom.useAbilityButton = document.getElementById('use-ability-button');
    dom.combatStatus = document.getElementById('combat-status');
  }

  function attachEventListeners() {
    dom.classSelect.addEventListener('change', () => updateClassDescription(dom.classSelect.value));

    dom.professionOptions.addEventListener('change', event => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }
      if (target.checked) {
        const selected = getSelectedProfessionIds();
        if (selected.length > MAX_PROFESSIONS) {
          target.checked = false;
          showSetupFeedback(`You can only train ${MAX_PROFESSIONS} professions.`, 'warning');
        }
      }
    });

    dom.startButton.addEventListener('click', startAdventure);
    dom.zoneSelect.addEventListener('change', () => handleZoneChange(dom.zoneSelect.value));
    dom.exploreButton.addEventListener('click', exploreCurrentZone);
    dom.restButton.addEventListener('click', restAtCamp);
    dom.talkNpcButton.addEventListener('click', talkToSelectedNpc);
    dom.enterDungeonButton.addEventListener('click', enterOrProgressDungeon);
    dom.useAbilityButton.addEventListener('click', useSelectedAbility);
    dom.abilitySelect.addEventListener('change', () => updateAbilityDescription(dom.abilitySelect.value));
  }

  function loadGameData() {
    Promise.all(DATA_SOURCES.map(src => fetch(src.path).then(response => {
      if (!response.ok) {
        throw new Error(`Failed to load ${src.path}`);
      }
      return response.json();
    })))
      .then(results => {
        DATA_SOURCES.forEach((src, index) => {
          gameData[src.key] = results[index];
          gameData.lookups[src.key] = Object.fromEntries(results[index].map(entry => [entry.id, entry]));
        });
        state.loaded = true;
        populateInitialUi();
      })
      .catch(error => {
        console.error(error);
        showSetupFeedback('Failed to load game data. Please refresh.', 'error');
      });
  }

  function populateInitialUi() {
    populateClassOptions();
    populateProfessionOptions();
    populateZoneOptions();
    updateClassDescription(dom.classSelect.value);
    updateZoneDetails();
    updateNpcOptions();
    updateDungeonOptions();
    updateActionAvailability();
    addLog('Legends of Azerai awaits. Configure your adventurer to begin.');
  }

  function populateClassOptions() {
    clearChildren(dom.classSelect);
    gameData.classes.forEach((cls, index) => {
      const option = document.createElement('option');
      option.value = cls.id;
      option.textContent = cls.name;
      if (index === 0) {
        option.selected = true;
      }
      dom.classSelect.append(option);
    });
  }

  function populateProfessionOptions() {
    clearChildren(dom.professionOptions);
    gameData.professions.forEach(profession => {
      const label = document.createElement('label');
      label.className = 'option';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = profession.id;
      const span = document.createElement('span');
      span.innerHTML = `<strong>${profession.name}</strong><br><small>${profession.description}</small>`;
      label.append(input, span);
      dom.professionOptions.append(label);
    });
  }

  function populateZoneOptions() {
    clearChildren(dom.zoneSelect);
    gameData.zones.forEach((zone, index) => {
      const option = document.createElement('option');
      option.value = zone.id;
      option.textContent = `${zone.name} (Lv. ${zone.recommendedLevel}+ )`;
      if (index === 0) {
        option.selected = true;
        state.currentZoneId = zone.id;
      }
      dom.zoneSelect.append(option);
    });
  }

  function updateClassDescription(classId) {
    const cls = gameData.lookups.classes[classId];
    if (!cls) {
      dom.classDescription.textContent = 'Select a class to view its lore and abilities.';
      return;
    }
    const abilityList = cls.abilities.map(ability => `<li><strong>${ability.name}</strong> — ${ability.description} (Cost: ${ability.resourceCost} mana)</li>`).join('');
    dom.classDescription.innerHTML = `
      <p>${cls.description}</p>
      <h3>Base Attributes</h3>
      <ul>
        <li>Health: ${cls.baseStats.health}</li>
        <li>Mana: ${cls.baseStats.mana}</li>
        <li>Strength: ${cls.baseStats.strength}</li>
        <li>Agility: ${cls.baseStats.agility}</li>
        <li>Intellect: ${cls.baseStats.intellect}</li>
      </ul>
      <h3>Signature Abilities</h3>
      <ul>${abilityList}</ul>
    `;
  }

  function updateZoneDetails() {
    const zone = getCurrentZone();
    if (!zone) {
      dom.zoneDetails.textContent = 'Select a zone to learn more about its dangers and opportunities.';
      return;
    }

    const enemies = Array.isArray(zone.enemies) ? zone.enemies : [];
    const gatherables = Array.isArray(zone.gatherables) ? zone.gatherables : [];
    const enemyNames = enemies.map(id => gameData.lookups.enemies[id]?.name || id).join(', ');
    const gatherLines = gatherables.map(node => {
      const prof = gameData.lookups.professions[node.professionId];
      const item = gameData.lookups.items[node.itemId];
      const profName = prof ? prof.name : node.professionId;
      const itemName = item ? item.name : node.itemId;
      const quantity = node.minQuantity === node.maxQuantity ? `${node.minQuantity}` : `${node.minQuantity}-${node.maxQuantity}`;
      return `<li>${itemName} (${quantity}) — ${profName}</li>`;
    }).join('');

    dom.zoneDetails.innerHTML = `
      <p><strong>${zone.name}</strong>: ${zone.description}</p>
      <p><strong>Common Enemies:</strong> ${enemyNames || 'Unknown creatures'}</p>
      <p><strong>Recommended Level:</strong> ${zone.recommendedLevel}</p>
      <h3>Resource Nodes</h3>
      <ul>${gatherLines || '<li>None documented</li>'}</ul>
    `;
  }

  function updateNpcOptions() {
    const zone = getCurrentZone();
    clearChildren(dom.npcSelect);
    if (!zone || !zone.npcs || zone.npcs.length === 0) {
      setHidden(dom.npcControls, true);
      return;
    }
    zone.npcs.forEach((npcId, index) => {
      const npc = gameData.lookups.npcs[npcId];
      if (!npc) {
        return;
      }
      const option = document.createElement('option');
      option.value = npc.id;
      option.textContent = `${npc.name} — ${npc.role}`;
      if (index === 0) {
        option.selected = true;
      }
      dom.npcSelect.append(option);
    });
    setHidden(dom.npcControls, !state.started);
  }

  function updateDungeonOptions() {
    const zone = getCurrentZone();
    clearChildren(dom.dungeonSelect);
    if (!zone || !zone.dungeons || zone.dungeons.length === 0) {
      setHidden(dom.dungeonControls, true);
      return;
    }
    zone.dungeons.forEach((dungeonId, index) => {
      const dungeon = gameData.lookups.dungeons[dungeonId];
      if (!dungeon) {
        return;
      }
      const option = document.createElement('option');
      option.value = dungeon.id;
      option.textContent = `${dungeon.name} (Lv. ${dungeon.recommendedLevel}+ )`;
      if (index === 0) {
        option.selected = true;
      }
      dom.dungeonSelect.append(option);
    });
    setHidden(dom.dungeonControls, !state.started);
    updateDungeonButton();
  }

  function startAdventure() {
    if (!state.loaded || state.started) {
      return;
    }
    const classId = dom.classSelect.value;
    const chosenClass = gameData.lookups.classes[classId];
    if (!chosenClass) {
      showSetupFeedback('Please select a class to begin.', 'warning');
      return;
    }
    const professions = getSelectedProfessionIds();
    if (professions.length > MAX_PROFESSIONS) {
      showSetupFeedback(`Select at most ${MAX_PROFESSIONS} professions.`, 'warning');
      return;
    }

    const heroName = dom.playerNameInput.value.trim() || 'Adventurer';
    state.player = createPlayer(heroName, chosenClass, professions);
    state.started = true;
    showSetupFeedback('', 'info');
    addLog(`${state.player.name}, the ${chosenClass.name}, sets foot in ${getCurrentZone()?.name || 'the wilds'}.`);
    if (professions.length > 0) {
      const professionNames = professions.map(id => gameData.lookups.professions[id]?.name || id).join(', ');
      addLog(`Professions trained: ${professionNames}.`);
    }
    updatePlayerInfo();
    updateInventoryInfo();
    updateNpcOptions();
    updateDungeonOptions();
    updateActionAvailability();
    updateAbilityChoices();
  }

  function createPlayer(name, chosenClass, professionIds) {
    const player = {
      name,
      classId: chosenClass.id,
      className: chosenClass.name,
      primaryStat: chosenClass.primaryStat,
      level: 1,
      xp: 0,
      attributes: {
        strength: chosenClass.baseStats.strength,
        agility: chosenClass.baseStats.agility,
        intellect: chosenClass.baseStats.intellect
      },
      maxHealth: chosenClass.baseStats.health,
      currentHealth: chosenClass.baseStats.health,
      maxMana: chosenClass.baseStats.mana,
      currentMana: chosenClass.baseStats.mana,
      professions: [...professionIds],
      inventory: [],
      abilities: []
    };

    player.abilities.push(createBasicAbility(chosenClass));
    chosenClass.abilities.forEach(ability => {
      player.abilities.push({ ...ability });
    });

    if (Array.isArray(chosenClass.startingItems)) {
      chosenClass.startingItems.forEach(itemId => addItemToInventory(player, itemId));
    }

    return player;
  }

  function createBasicAbility(chosenClass) {
    const statLabel = chosenClass.primaryStat.charAt(0).toUpperCase() + chosenClass.primaryStat.slice(1);
    return {
      id: 'basic_attack',
      name: 'Basic Attack',
      type: 'damage',
      resourceCost: 0,
      stat: chosenClass.primaryStat,
      multiplier: 1.0,
      flatBonus: 3,
      description: `A dependable strike fueled by your ${statLabel}.`
    };
  }

  function getSelectedProfessionIds() {
    return Array.from(dom.professionOptions.querySelectorAll('input[type="checkbox"]:checked')).map(input => input.value);
  }

  function showSetupFeedback(message, level) {
    dom.setupFeedback.textContent = message;
    dom.setupFeedback.dataset.level = level || 'info';
  }

  function updatePlayerInfo() {
    if (!state.player) {
      dom.playerInfo.innerHTML = '<p>Create a hero to view statistics.</p>';
      return;
    }
    const player = state.player;
    const xpGoal = xpToNextLevel(player.level);
    const professionNames = player.professions.length > 0
      ? player.professions.map(id => gameData.lookups.professions[id]?.name || id).join(', ')
      : 'None';
    dom.playerInfo.innerHTML = `
      <p><strong>${player.name}</strong> — Level ${player.level} ${player.className}</p>
      <ul>
        <li>Health: ${player.currentHealth} / ${player.maxHealth}</li>
        <li>Mana: ${player.currentMana} / ${player.maxMana}</li>
        <li>Strength: ${player.attributes.strength}</li>
        <li>Agility: ${player.attributes.agility}</li>
        <li>Intellect: ${player.attributes.intellect}</li>
        <li>Experience: ${player.xp} / ${xpGoal}</li>
        <li>Professions: ${professionNames}</li>
      </ul>
    `;
  }

  function updateInventoryInfo() {
    if (!state.player) {
      dom.inventoryInfo.innerHTML = '';
      return;
    }
    const inventory = state.player.inventory;
    if (inventory.length === 0) {
      dom.inventoryInfo.innerHTML = '<h3>Inventory</h3><p>No items carried.</p>';
      return;
    }
    const lines = inventory
      .slice()
      .sort((a, b) => {
        const itemA = gameData.lookups.items[a.itemId]?.name || a.itemId;
        const itemB = gameData.lookups.items[b.itemId]?.name || b.itemId;
        return itemA.localeCompare(itemB);
      })
      .map(entry => {
        const item = gameData.lookups.items[entry.itemId];
        const name = item ? item.name : entry.itemId;
        return `<li>${name} × ${entry.quantity}</li>`;
      })
      .join('');
    dom.inventoryInfo.innerHTML = `<h3>Inventory</h3><ul>${lines}</ul>`;
  }

  function handleZoneChange(zoneId) {
    state.currentZoneId = zoneId;
    if (state.currentDungeon) {
      addLog('You abandon your current delve as you travel to a new zone.');
      state.currentDungeon = null;
      updateDungeonButton();
    }
    updateZoneDetails();
    updateNpcOptions();
    updateDungeonOptions();
    if (state.started) {
      const zone = getCurrentZone();
      addLog(`You travel to ${zone ? zone.name : 'an unknown land'}.`);
    }
    updateActionAvailability();
  }

  function exploreCurrentZone() {
    if (!state.started || state.combat || state.currentDungeon) {
      return;
    }
    const zone = getCurrentZone();
    if (!zone) {
      addLog('You look around but find no path forward.');
      return;
    }
    const roll = Math.random();
    const enemies = Array.isArray(zone.enemies) ? zone.enemies : [];
    if (roll < 0.6 && enemies.length > 0) {
      const enemyId = randomChoice(enemies);
      const enemy = gameData.lookups.enemies[enemyId];
      if (!enemy) {
        addLog('An indescribable creature watches from afar.');
        return;
      }
      startCombat(enemy, { source: 'zone', zoneId: zone.id });
    } else if (roll < 0.85) {
      resolveGatherEvent(zone);
    } else {
      narrateAmbientMoment(zone);
    }
  }

  function resolveGatherEvent(zone) {
    if (!state.player) {
      return;
    }
    const gatherables = Array.isArray(zone.gatherables) ? zone.gatherables : [];
    const available = gatherables.filter(node => state.player.professions.includes(node.professionId));
    if (available.length === 0) {
      addLog('You discover valuable resources but lack the skill to harvest them.');
      return;
    }
    const node = randomChoice(available);
    const quantity = randomInt(node.minQuantity, node.maxQuantity);
    addItemToInventory(state.player, node.itemId, quantity);
    const item = gameData.lookups.items[node.itemId];
    const itemName = item ? item.name : node.itemId;
    const profession = gameData.lookups.professions[node.professionId]?.name || node.professionId;
    addLog(`Your ${profession} training yields ${quantity} × ${itemName}.`);
    updateInventoryInfo();
  }

  function narrateAmbientMoment(zone) {
    if (zone.ambientLore && zone.ambientLore.length > 0) {
      addLog(randomChoice(zone.ambientLore));
    } else {
      addLog('The journey is quiet—for now.');
    }
  }

  function restAtCamp() {
    if (!state.started) {
      return;
    }
    if (state.combat) {
      addLog('You cannot make camp while fighting!');
      return;
    }
    state.player.currentHealth = state.player.maxHealth;
    state.player.currentMana = state.player.maxMana;
    addLog('You make camp and recover your strength.');
    updatePlayerInfo();
    updateCombatStatus();
  }

  function talkToSelectedNpc() {
    if (!state.started) {
      return;
    }
    const npcId = dom.npcSelect.value;
    const npc = gameData.lookups.npcs[npcId];
    if (!npc) {
      addLog('No ally answers your call.');
      return;
    }
    const line = randomChoice(npc.dialogue);
    addLog(`${npc.name}: "${line}"`);

    const rewards = Array.isArray(npc.rewards) ? npc.rewards : [];
    if (rewards.length > 0) {
      rewards.forEach(reward => {
        const rewardKey = `${npc.id}:${reward.itemId}`;
        if (reward.once && state.npcRewardsClaimed.has(rewardKey)) {
          return;
        }
        addItemToInventory(state.player, reward.itemId);
        const item = gameData.lookups.items[reward.itemId];
        const itemName = item ? item.name : reward.itemId;
        addLog(reward.description || `${npc.name} gives you ${itemName}.`);
        state.npcRewardsClaimed.add(rewardKey);
      });
      updateInventoryInfo();
    }

    const teachings = Array.isArray(npc.teachesProfessions) ? npc.teachesProfessions : [];
    if (teachings.length > 0) {
      teachings.forEach(professionId => {
        if (!state.player.professions.includes(professionId)) {
          if (state.player.professions.length < MAX_PROFESSIONS) {
            state.player.professions.push(professionId);
            const professionName = gameData.lookups.professions[professionId]?.name || professionId;
            addLog(`${npc.name} teaches you ${professionName}.`);
          } else {
            addLog(`${npc.name} offers to teach you more, but you have reached your profession limit.`);
          }
        }
      });
      updatePlayerInfo();
      updateZoneDetails();
    }
  }

  function enterOrProgressDungeon() {
    if (!state.started || state.combat) {
      return;
    }
    const selectedId = dom.dungeonSelect.value;
    if (!selectedId) {
      addLog('Select a dungeon to enter.');
      return;
    }
    const dungeon = gameData.lookups.dungeons[selectedId];
    if (!dungeon) {
      addLog('The path ahead is blocked.');
      return;
    }

    if (!state.currentDungeon || state.currentDungeon.id !== selectedId) {
      state.currentDungeon = {
        id: selectedId,
        stage: 'encounters',
        encounterPointer: 0,
        readyForNext: false,
        bossDefeated: false
      };
      addLog(`You step into ${dungeon.name}. ${dungeon.description}`);
      if (state.player.level < dungeon.recommendedLevel) {
        addLog('A chill runs down your spine—you are below the recommended level.');
      }
      startNextDungeonFight();
    } else if (state.currentDungeon.readyForNext && !state.currentDungeon.bossDefeated) {
      startNextDungeonFight();
    } else if (state.currentDungeon.bossDefeated) {
      addLog('The dungeon lies quiet. You may re-enter after leaving the zone.');
    } else {
      addLog('You are already delving this dungeon.');
    }
    updateActionAvailability();
    updateDungeonButton();
  }

  function startNextDungeonFight() {
    const dungeonState = state.currentDungeon;
    if (!dungeonState) {
      return;
    }
    const dungeon = gameData.lookups.dungeons[dungeonState.id];
    if (!dungeon) {
      return;
    }

    if (dungeonState.stage === 'encounters') {
      const encounters = Array.isArray(dungeon.encounters) ? dungeon.encounters : [];
      if (dungeonState.encounterPointer < encounters.length) {
        const enemyId = encounters[dungeonState.encounterPointer];
        const enemy = gameData.lookups.enemies[enemyId];
        if (!enemy) {
          addLog('An unknown threat stalks the halls, but you move on.');
          dungeonState.encounterPointer += 1;
          dungeonState.readyForNext = true;
          updateDungeonButton();
          return;
        }
        dungeonState.readyForNext = false;
        startCombat(enemy, { source: 'dungeon', dungeonId: dungeon.id, encounterType: 'encounter' });
      } else {
        dungeonState.stage = 'boss';
        dungeonState.readyForNext = true;
        addLog('You stand before the heart of the dungeon. Steel yourself for the final battle.');
        updateDungeonButton();
      }
    } else if (dungeonState.stage === 'boss') {
      const boss = gameData.lookups.enemies[dungeon.boss];
      if (!boss) {
        addLog('The true foe never appears—the magic here fades away.');
        finishDungeon();
        return;
      }
      dungeonState.readyForNext = false;
      startCombat(boss, { source: 'dungeon', dungeonId: dungeon.id, encounterType: 'boss' });
    }
  }

  function startCombat(enemy, options) {
    options = options || {};
    state.combat = {
      enemyId: enemy.id,
      enemyName: enemy.name,
      maxHealth: enemy.health,
      health: enemy.health,
      enemyData: enemy,
      options
    };
    addLog(`A level ${enemy.level} ${enemy.name} challenges you!`);
    setHidden(dom.combatControls, false);
    updateAbilityChoices();
    updateCombatStatus();
    updateActionAvailability();
  }

  function useSelectedAbility() {
    if (!state.combat || !state.player) {
      addLog('There is nothing to strike at the moment.');
      return;
    }
    const abilityId = dom.abilitySelect.value;
    const ability = state.player.abilities.find(ab => ab.id === abilityId);
    if (!ability) {
      addLog('You hesitate, unsure which technique to use.');
      return;
    }
    if (ability.resourceCost > state.player.currentMana) {
      addLog('You lack the mana to wield that ability.');
      return;
    }

    state.player.currentMana -= ability.resourceCost;
    const effectiveness = applyVariance(ability.flatBonus + ability.multiplier * (state.player.attributes[ability.stat] || 0));

    if (ability.type === 'heal') {
      const healAmount = Math.min(effectiveness, state.player.maxHealth - state.player.currentHealth);
      state.player.currentHealth += healAmount;
      addLog(`${state.player.name} uses ${ability.name} and restores ${healAmount} health.`);
    } else {
      const damage = Math.min(effectiveness, state.combat.health);
      state.combat.health -= damage;
      addLog(`${state.player.name} uses ${ability.name}, dealing ${damage} damage.`);
    }

    updateCombatStatus();
    updatePlayerInfo();

    if (state.combat.health <= 0) {
      concludeCombatVictory();
    } else {
      enemyTurn();
    }
  }

  function enemyTurn() {
    const enemy = state.combat.enemyData;
    const damage = randomInt(enemy.damage.min, enemy.damage.max);
    state.player.currentHealth = Math.max(0, state.player.currentHealth - damage);
    addLog(`${enemy.name} strikes for ${damage} damage.`);
    updatePlayerInfo();
    if (state.player.currentHealth <= 0) {
      concludeCombatDefeat();
    } else {
      updateCombatStatus();
    }
  }

  function concludeCombatVictory() {
    const combat = state.combat;
    const enemy = combat.enemyData;
    addLog(`You defeat the ${enemy.name}!`);
    grantCombatRewards(enemy, combat.options);
    endCombat();
    if (combat.options && combat.options.source === 'dungeon') {
      advanceDungeonState(combat.options);
    }
  }

  function concludeCombatDefeat() {
    const combat = state.combat;
    const enemy = combat.enemyData;
    addLog(`The ${enemy.name} overwhelms you. You retreat to safety.`);
    state.player.currentHealth = Math.max(1, Math.ceil(state.player.maxHealth * 0.5));
    state.player.currentMana = Math.max(0, Math.ceil(state.player.maxMana * 0.5));
    if (state.currentDungeon) {
      addLog('Your delve ends abruptly as you stagger out of the dungeon.');
      state.currentDungeon = null;
    }
    endCombat();
    updatePlayerInfo();
    updateActionAvailability();
  }

  function grantCombatRewards(enemy, options) {
    const xp = enemy.xp || 0;
    if (xp > 0) {
      gainExperience(xp);
      addLog(`You gain ${xp} experience.`);
    }
    if (enemy.loot) {
      enemy.loot.forEach(entry => {
        if (Math.random() <= (entry.chance ?? 0)) {
          addItemToInventory(state.player, entry.itemId, entry.quantity || 1);
          const itemName = gameData.lookups.items[entry.itemId]?.name || entry.itemId;
          addLog(`Loot acquired: ${itemName}`);
        }
      });
      updateInventoryInfo();
    }

    if (options && options.source === 'dungeon' && options.encounterType === 'boss') {
      rewardDungeonClear(options.dungeonId);
    }
  }

  function rewardDungeonClear(dungeonId) {
    const dungeon = gameData.lookups.dungeons[dungeonId];
    if (!dungeon) {
      return;
    }
    const rewards = Array.isArray(dungeon.rewards) ? dungeon.rewards : [];
    if (rewards.length > 0) {
      rewards.forEach(itemId => {
        addItemToInventory(state.player, itemId);
        const itemName = gameData.lookups.items[itemId]?.name || itemId;
        addLog(`Dungeon reward secured: ${itemName}`);
      });
      updateInventoryInfo();
    }
  }

  function advanceDungeonState(options) {
    const dungeonState = state.currentDungeon;
    if (!dungeonState || dungeonState.id !== options.dungeonId) {
      return;
    }
    const dungeon = gameData.lookups.dungeons[dungeonState.id];
    if (!dungeon) {
      return;
    }

    if (options.encounterType === 'encounter') {
      const encounters = Array.isArray(dungeon.encounters) ? dungeon.encounters : [];
      dungeonState.encounterPointer += 1;
      if (dungeonState.encounterPointer >= encounters.length) {
        dungeonState.stage = 'boss';
        addLog('Only the dungeon guardian remains. Prepare when you are ready.');
      } else {
        addLog('The path winds deeper. Catch your breath before the next fight.');
      }
      dungeonState.readyForNext = true;
    } else if (options.encounterType === 'boss') {
      dungeonState.bossDefeated = true;
      addLog(`You have conquered ${dungeon.name}!`);
      dungeonState.readyForNext = false;
      finishDungeon();
    }
    updateDungeonButton();
    updateActionAvailability();
  }

  function finishDungeon() {
    state.currentDungeon = null;
    updateDungeonButton();
    updateActionAvailability();
  }

  function endCombat() {
    state.combat = null;
    setHidden(dom.combatControls, true);
    updateActionAvailability();
  }

  function updateCombatStatus() {
    if (!state.combat) {
      dom.combatStatus.textContent = '';
      return;
    }
    const combat = state.combat;
    const enemy = combat.enemyData;
    dom.combatStatus.textContent = `${enemy.name} — HP ${combat.health} / ${combat.maxHealth}`;
  }

  function updateAbilityChoices() {
    if (!state.player) {
      clearChildren(dom.abilitySelect);
      return;
    }
    const previousSelection = dom.abilitySelect.value;
    clearChildren(dom.abilitySelect);
    state.player.abilities.forEach((ability, index) => {
      const option = document.createElement('option');
      option.value = ability.id;
      option.textContent = `${ability.name} (${ability.type === 'heal' ? 'Heal' : 'Damage'})`;
      if ((previousSelection && previousSelection === ability.id) || (!previousSelection && index === 0)) {
        option.selected = true;
      }
      dom.abilitySelect.append(option);
    });
    updateAbilityDescription(dom.abilitySelect.value);
  }

  function updateAbilityDescription(abilityId) {
    if (!state.player) {
      dom.abilityDescription.textContent = '';
      return;
    }
    const ability = state.player.abilities.find(ab => ab.id === abilityId);
    if (!ability) {
      dom.abilityDescription.textContent = '';
      return;
    }
    const costText = ability.resourceCost > 0 ? `${ability.resourceCost} mana` : 'No mana cost';
    dom.abilityDescription.textContent = `${ability.description} (${costText})`;
  }

  function updateActionAvailability() {
    const inCombat = Boolean(state.combat);
    const inDungeon = Boolean(state.currentDungeon);
    const gameStarted = Boolean(state.started);

    dom.exploreButton.disabled = !gameStarted || inCombat || inDungeon;
    dom.restButton.disabled = !gameStarted || inCombat;
    dom.talkNpcButton.disabled = !gameStarted || inCombat;
    dom.enterDungeonButton.disabled = !gameStarted || inCombat;

    if (state.started) {
      updateNpcOptions();
      updateDungeonOptions();
    }
  }

  function updateDungeonButton() {
    if (setHidden(dom.dungeonControls, !state.started || dom.dungeonSelect.options.length === 0)) {
      dom.enterDungeonButton.disabled = true;
      return;
    }
    if (!state.currentDungeon) {
      dom.enterDungeonButton.textContent = 'Enter Dungeon';
      return;
    }
    if (state.currentDungeon.bossDefeated) {
      dom.enterDungeonButton.textContent = 'Dungeon Cleared';
      dom.enterDungeonButton.disabled = true;
      return;
    }
    if (state.currentDungeon.stage === 'boss') {
      dom.enterDungeonButton.textContent = state.currentDungeon.readyForNext ? 'Face the Boss' : 'Battling...';
    } else {
      dom.enterDungeonButton.textContent = state.currentDungeon.readyForNext ? 'Continue Deeper' : 'Battling...';
    }
  }

  function gainExperience(amount) {
    state.player.xp += amount;
    let leveled = false;
    while (state.player.xp >= xpToNextLevel(state.player.level)) {
      state.player.xp -= xpToNextLevel(state.player.level);
      state.player.level += 1;
      leveled = true;
      applyLevelGrowth();
      addLog(`You reach level ${state.player.level}!`);
    }
    if (leveled) {
      updatePlayerInfo();
    }
  }

  function applyLevelGrowth() {
    const chosenClass = gameData.lookups.classes[state.player.classId];
    if (!chosenClass) {
      return;
    }
    const growth = chosenClass.statGrowth;
    state.player.maxHealth += growth.health;
    state.player.maxMana += growth.mana;
    state.player.attributes.strength += growth.strength;
    state.player.attributes.agility += growth.agility;
    state.player.attributes.intellect += growth.intellect;
    state.player.currentHealth = state.player.maxHealth;
    state.player.currentMana = state.player.maxMana;
  }

  function xpToNextLevel(level) {
    return 100 + (level - 1) * 75;
  }

  function addItemToInventory(player, itemId, quantity) {
    quantity = quantity || 1;
    const existing = player.inventory.find(entry => entry.itemId === itemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      player.inventory.push({ itemId, quantity });
    }
  }

  function clearChildren(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function setHidden(element, hidden) {
    if (!element) {
      return true;
    }
    element.classList.toggle('hidden', hidden);
    return hidden;
  }

  function randomChoice(array) {
    if (!array || array.length === 0) {
      return undefined;
    }
    const index = Math.floor(Math.random() * array.length);
    return array[index];
  }

  function randomInt(min, max) {
    const lower = Math.ceil(min);
    const upper = Math.floor(max);
    return Math.floor(Math.random() * (upper - lower + 1)) + lower;
  }

  function applyVariance(value, variance) {
    const spread = variance ?? 0.2;
    const factor = 1 - spread + Math.random() * (spread * 2);
    return Math.max(1, Math.round(value * factor));
  }

  function getCurrentZone() {
    if (!state.currentZoneId) {
      return null;
    }
    return gameData.lookups.zones[state.currentZoneId] || null;
  }

  function addLog(message) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.textContent = message;
    dom.log.append(entry);
    dom.log.scrollTop = dom.log.scrollHeight;
  }

})();

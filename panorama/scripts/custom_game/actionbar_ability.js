(function() {
    var ABILITY_STATE_DEFAULT = 0,
        ABILITY_STATE_ACTIVE = 1,
        ABILITY_STATE_ABILITY_PHASE = 2,
        ABILITY_STATE_COOLDOWN = 3;

    var currentState = ABILITY_STATE_DEFAULT;
    var panel = $.GetContextPanel();

    /* Initialise this ability panel with an ability (like a constructor). */
    panel.init = function(ability, unit) {
        // Do some bookkeeping
        panel.ability = ability;
        panel.abilityName = Abilities.GetAbilityName(ability);
        panel.ownerUnit = unit;
        panel.level = 0;
        panel.maxLevel = Abilities.GetMaxLevel(panel.ability);
        panel.learning = false;

        panel.pips = [];

        // Set the ability image.
        $( "#AbilityImage" ).abilityname = panel.abilityName;
        $( "#AbilityImage" ).contextEntityIndex = panel.ability;

        // Set a special style for passive abilities
        if (Abilities.IsPassive(panel.ability)) {
            $( "#AbilityFrame" ).AddClass("Passive");
        }

        // Add ability pips.
        panel.addLevelPips();

        // Set the level of the ability.
        panel.setLevel(Abilities.GetLevel(panel.ability));

        // Set hotkey panel.
        var hotkey = Abilities.GetKeybind(panel.ability);
        if (Abilities.IsPassive(panel.ability)) {
            $("#HotkeyLabel").style.visibility = "collapse";
        } else {
            $("#HotkeyLabel").text = hotkey;
        }
    }

    /* Re-initialise when fetching this existing panel again. */
    panel.reinit = function() {
        // Set the level of the ability.
        panel.setLevel(Abilities.GetLevel(panel.ability));

        // Check if we can still upgrade.
        panel.setLearnMode(panel.learning);
    }

    /* Show the ability tooltip */
    panel.showTooltip = function() {
        var abilityButton = $("#AbilityButton");
        $.DispatchEvent("DOTAShowAbilityTooltipForEntityIndex", abilityButton, panel.abilityName, panel.ownerUnit);
    }

    /* Hide the tooltip */
    panel.hideTooltip = function() {
        var abilityButton = $("#AbilityButton");
        $.DispatchEvent("DOTAHideAbilityTooltip", abilityButton);
    }

    /* Left click */
    panel.onLeftClick = function() {
        if (panel.learning) {
            Abilities.AttemptToUpgrade(panel.ability);
        } else {
            Abilities.ExecuteAbility(panel.ability, panel.ownerUnit, false);
        }
    }

    /* Right click */
    panel.onRightClick = function() {
        if (Abilities.IsAutocast(panel.ability)) {
            //Abilities.
            //Turn on autocast - API where?!
        }
    }

    /* Start cooldown animation based on current duration and the total duration */
    panel.startCooldown = function(duration) {
        // Do the radial clip thing.
        var totalDuration = Abilities.GetCooldownLength(panel.ability);
        $("#cooldownswipe").style.opacity = "0.75";
        $("#cooldownswipe").style.transitionDuration = totalDuration+"s";
        $("#cooldownswipe").style.clip = "radial(50% 50%, 0deg, 0deg)";
        $.Schedule(duration, function() {
            $("#cooldownswipe").style.opacity = "0";
            $("#cooldownswipe").style.clip = "radial(50% 50%, 0deg, -360deg)";
        });
    }

    /* Add level pips. */
    panel.addLevelPips = function(level) {
        // Add pips.
        var pipContainer = $("#PipContainer");
        var maxLevel = panel.maxLevel;
        if (maxLevel < 8) {
            for (var i = 0; i < maxLevel; i++) {
                var pip = $.CreatePanel("Panel", pipContainer, "");
                if (i < level) {
                    pip.AddClass("LeveledPip");
                } else {
                    pip.AddClass("EmptyPip");
                }
                if (maxLevel > 5) {
                    pip.AddClass("Small");
                }
                panel.pips.push(pip);
            }
        } else {
            //Add pips for levels > 8
            var pipLabel = $.CreatePanel("Label", pipContainer, "");
            pipLabel.text = "0/"+maxLevel;
            panel.pips[0] = pipLabel;
        }
    }

    /* Set the level of the ability */
    panel.setLevel = function(level) {
        // Get the mana cost
        var manaCost = Abilities.GetManaCost(panel.ability);

        // If level == 0 desaturate image with css, otherwise revert
        if (level == 0) {
            $("#AbilityImage").AddClass("NotLearned");
            $("#ManaLabel").style.visibility = "collapse";
        } else {
            $("#AbilityImage").RemoveClass("NotLearned");

            if (manaCost > 0) {
                $("#ManaLabel").style.visibility = "visible";
                $("#ManaLabel").text = manaCost;
            } else {
                $("#ManaLabel").style.visibility = "collapse";
            }
        }

        panel.level = level;

        // Set pips.
        if (panel.maxLevel < 8) {
            var pipContainer = $("#PipContainer");
            for (var i = 0; i < level; i++) {
                var pip = panel.pips[i];
                if (pip.BHasClass("EmptyPip")) {
                    pip.RemoveClass("EmptyPip");
                    pip.AddClass("LeveledPip");
                }
            }
        } else {
            panel.pips[0].text = level + "/" + panel.maxLevel;
        }
    }

    /* Set if this panel is learning or not */
    panel.setLearnMode = function(learnMode) {
        // Make sure to cast by default.
        panel.learning = false;

        // Check if we're in learn mode (NOTE: Bug in CanAbilityBeUpgraded (inverted))
        if (learnMode && Abilities.CanAbilityBeUpgraded(panel.ability) === AbilityLearnResult_t.ABILITY_CAN_BE_UPGRADED) {
            $("#LearnOverlay").style.visibility = "visible";
            panel.learning = true;
        } else {
            $("#LearnOverlay").style.visibility = "collapse";
        }
    }

    /* Check for changes in the ability state */
    panel.update = function() {
        var state = ABILITY_STATE_DEFAULT;
        if (Abilities.GetLocalPlayerActiveAbility() === panel.ability) {
            state = ABILITY_STATE_ACTIVE;
        }
        else if (Abilities.IsInAbilityPhase(panel.ability) || Abilities.GetToggleState(panel.ability)) {
            state = ABILITY_STATE_ABILITY_PHASE;
        }
        else if (!Abilities.IsCooldownReady(panel.ability)) {
            state = ABILITY_STATE_COOLDOWN;
        }

        if (state !== currentState) {
            if (state === ABILITY_STATE_DEFAULT) {
                $("#AbilityImage").RemoveClass("Active");
                $("#AbilityImage").RemoveClass("AbilityPhase");
                $("#AbilityImage").RemoveClass("Cooldown");
            } else if (state === ABILITY_STATE_ACTIVE) {
                $("#AbilityImage").AddClass("Active");
                $("#AbilityImage").RemoveClass("AbilityPhase");
                $("#AbilityImage").RemoveClass("Cooldown");
            } else if (state === ABILITY_STATE_ABILITY_PHASE) {
                $("#AbilityImage").RemoveClass("Active");
                $("#AbilityImage").AddClass("AbilityPhase");
                $("#AbilityImage").RemoveClass("Cooldown");
            } else if (state === ABILITY_STATE_COOLDOWN) {
                $("#AbilityImage").RemoveClass("Active");
                $("#AbilityImage").RemoveClass("AbilityPhase");
                $("#AbilityImage").AddClass("Cooldown");

                panel.startCooldown(Abilities.GetCooldownTimeRemaining(panel.ability));
            }

            currentState = state;
        }
    }
})();
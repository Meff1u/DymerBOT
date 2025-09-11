const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits
} = require('discord.js');
const { levelSystem } = require('../../utils/levelSystem');
const fs = require('fs').promises;
const path = require('path');

async function saveConfig(configPath, config) {
    const configContent = `module.exports = {
    token: "${config.token}",
    rules: [
        ${config.rules.map((rule) => `"${rule.replace(/"/g, '\\"')}"`).join(",\n        ")}
    ],
    levelRoles: {
        ${Object.entries(config.levelRoles || {})
            .map(([level, roleId]) => `${level}: "${roleId}"`)
            .join(",\n        ")}
    }
}`;
    
    await fs.writeFile(configPath, configContent, "utf8");
}

const slash = {
    data: new SlashCommandBuilder()
        .setName('level-admin')
        .setDescription('Komendy administracyjne systemu leveli')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-xp')
                .setDescription('Ustaw XP użytkownika')
                .addUserOption(option =>
                    option
                        .setName('użytkownik')
                        .setDescription('Użytkownik do edycji')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('xp')
                        .setDescription('Ilość XP do ustawienia')
                        .setRequired(true)
                        .setMinValue(0)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-xp')
                .setDescription('Dodaj XP użytkownikowi')
                .addUserOption(option =>
                    option
                        .setName('użytkownik')
                        .setDescription('Użytkownik do edycji')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('xp')
                        .setDescription('Ilość XP do dodania')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Zresetuj poziom użytkownika')
                .addUserOption(option =>
                    option
                        .setName('użytkownik')
                        .setDescription('Użytkownik do zresetowania')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('Pokaż statystyki systemu leveli')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cooldown')
                .setDescription('Sprawdź cooldown XP użytkownika')
                .addUserOption(option =>
                    option
                        .setName('użytkownik')
                        .setDescription('Użytkownik do sprawdzenia')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-role')
                .setDescription('Dodaj rolę za konkretny poziom')
                .addIntegerOption(option =>
                    option
                        .setName('level')
                        .setDescription('Poziom wymagany do otrzymania roli')
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Rola do przyznania')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-role')
                .setDescription('Usuń rolę z systemu poziomów')
                .addIntegerOption(option =>
                    option
                        .setName('level')
                        .setDescription('Poziom z którego usunąć rolę')
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list-roles')
                .setDescription('Wyświetl wszystkie role poziomów')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('sync-roles')
                .setDescription('Synchronizuj role dla wszystkich użytkowników (może potrwać długo)')
        ),
    admin: true,
    run: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'set-xp':
                const setUser = interaction.options.getUser('użytkownik');
                const setXp = interaction.options.getInteger('xp');

                if (setUser.bot) {
                    return interaction.reply({
                        content: '❌ Nie można edytować XP botów!',
                        ephemeral: true
                    });
                }

                const userData = await levelSystem.getUser(setUser.id);
                userData.xp = setXp;
                
                // Przelicz poziom
                const levelData = levelSystem.calculateLevel(setXp);
                userData.level = levelData.level;
                
                await levelSystem.saveUser(setUser.id, userData);

                const setEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ XP ustawione')
                    .setDescription(`Ustawiono **${setXp} XP** dla ${setUser}\nNowy poziom: **${levelData.level}**`)
                    .setTimestamp();

                await interaction.reply({ embeds: [setEmbed], ephemeral: true });
                break;

            case 'add-xp':
                const addUser = interaction.options.getUser('użytkownik');
                const addXp = interaction.options.getInteger('xp');

                if (addUser.bot) {
                    return interaction.reply({
                        content: '❌ Nie można edytować XP botów!',
                        ephemeral: true
                    });
                }

                const addUserData = await levelSystem.getUser(addUser.id);
                const oldLevel = addUserData.level;
                addUserData.xp += addXp;
                
                // Przelicz poziom
                const addLevelData = levelSystem.calculateLevel(addUserData.xp);
                addUserData.level = addLevelData.level;
                
                await levelSystem.saveUser(addUser.id, addUserData);

                const addEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ XP dodane')
                    .setDescription(`Dodano **${addXp} XP** dla ${addUser}\nXP: **${addUserData.xp}** | Poziom: **${addLevelData.level}**`)
                    .setTimestamp();

                if (addLevelData.level > oldLevel) {
                    addEmbed.addFields({
                        name: '🎉 Level Up!',
                        value: `${oldLevel} → ${addLevelData.level}`,
                        inline: true
                    });
                }

                await interaction.reply({ embeds: [addEmbed], ephemeral: true });
                break;

            case 'reset':
                const resetUser = interaction.options.getUser('użytkownik');

                if (resetUser.bot) {
                    return interaction.reply({
                        content: '❌ Nie można resetować XP botów!',
                        ephemeral: true
                    });
                }

                const newUserData = {
                    level: 1,
                    xp: 0,
                    messages: 0,
                    lastXpGain: 0
                };

                await levelSystem.saveUser(resetUser.id, newUserData);

                const resetEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🔄 Poziom zresetowany')
                    .setDescription(`Zresetowano poziom dla ${resetUser}`)
                    .setTimestamp();

                await interaction.reply({ embeds: [resetEmbed], ephemeral: true });
                break;

            case 'stats':
                const allUsers = await levelSystem.getLeaderboard(1000);
                const totalUsers = allUsers.length;
                const totalXp = allUsers.reduce((sum, user) => sum + user.xp, 0);
                const totalMessages = allUsers.reduce((sum, user) => sum + user.messages, 0);
                const avgLevel = totalUsers > 0 ? (allUsers.reduce((sum, user) => sum + user.level, 0) / totalUsers).toFixed(1) : 0;

                const statsEmbed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('📊 Statystyki systemu leveli')
                    .addFields(
                        { name: '👥 Aktywni użytkownicy', value: totalUsers.toString(), inline: true },
                        { name: '💬 Łączne wiadomości', value: totalMessages.toString(), inline: true },
                        { name: '⭐ Łączne XP', value: totalXp.toString(), inline: true },
                        { name: '📈 Średni poziom', value: avgLevel, inline: true },
                        { name: '👑 Najwyższy poziom', value: allUsers[0]?.level?.toString() || '0', inline: true },
                        { name: '🏆 Lider rankingu', value: allUsers[0] ? `<@${allUsers[0].userId}>` : 'Brak', inline: true }
                    )
                    .setTimestamp();

                await interaction.reply({ embeds: [statsEmbed], ephemeral: true });
                break;

            case 'cooldown':
                const cooldownUser = interaction.options.getUser('użytkownik');

                if (cooldownUser.bot) {
                    return interaction.reply({
                        content: '❌ Boty nie mają cooldownu XP!',
                        ephemeral: true
                    });
                }

                const cooldownKey = `${cooldownUser.id}-${interaction.guild.id}`;
                const cooldownInstance = levelSystem.cooldowns.get(cooldownKey);
                
                if (!cooldownInstance) {
                    return interaction.reply({
                        content: `✅ ${cooldownUser} może otrzymać XP za następną wiadomość!`,
                        ephemeral: true
                    });
                }

                const timeLeft = 60000 - (Date.now() - cooldownInstance);
                
                if (timeLeft <= 0) {
                    return interaction.reply({
                        content: `✅ ${cooldownUser} może otrzymać XP za następną wiadomość!`,
                        ephemeral: true
                    });
                }

                const secondsLeft = Math.ceil(timeLeft / 1000);
                const cooldownEmbed = new EmbedBuilder()
                    .setColor(0xFFAA00)
                    .setTitle('⏱️ Cooldown XP')
                    .setDescription(`${cooldownUser} może otrzymać XP za **${secondsLeft} sekund**`)
                    .setTimestamp();

                await interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
                break;

            case 'add-role':
                const addRoleLevel = interaction.options.getInteger('level');
                const addRole = interaction.options.getRole('role');
                
                // Załaduj aktualną konfigurację
                delete require.cache[require.resolve('../../config.js')];
                const addRoleConfig = require('../../config.js');
                
                if (!addRoleConfig.levelRoles) {
                    addRoleConfig.levelRoles = {};
                }
                
                addRoleConfig.levelRoles[addRoleLevel] = addRole.id;
                
                const configPath = path.join(__dirname, '..', '..', 'config.js');
                await saveConfig(configPath, addRoleConfig);
                
                const addRoleEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Rola poziomu dodana')
                    .setDescription(`Rola ${addRole} zostanie przyznawana za osiągnięcie **poziomu ${addRoleLevel}**`)
                    .setTimestamp();
                
                await interaction.reply({ embeds: [addRoleEmbed], ephemeral: true });
                break;

            case 'remove-role':
                const removeRoleLevel = interaction.options.getInteger('level');
                
                // Załaduj aktualną konfigurację
                delete require.cache[require.resolve('../../config.js')];
                const removeRoleConfig = require('../../config.js');
                
                if (!removeRoleConfig.levelRoles || !removeRoleConfig.levelRoles[removeRoleLevel]) {
                    return interaction.reply({
                        content: `❌ Nie znaleziono roli dla poziomu ${removeRoleLevel}`,
                        ephemeral: true
                    });
                }
                
                const removedRoleId = removeRoleConfig.levelRoles[removeRoleLevel];
                const removedRole = interaction.guild.roles.cache.get(removedRoleId);
                delete removeRoleConfig.levelRoles[removeRoleLevel];
                
                const removeConfigPath = path.join(__dirname, '..', '..', 'config.js');
                await saveConfig(removeConfigPath, removeRoleConfig);
                
                const removeRoleEmbed = new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('🗑️ Rola poziomu usunięta')
                    .setDescription(`Usunięto rolę ${removedRole || 'Nieznana rola'} z poziomu ${removeRoleLevel}`)
                    .setTimestamp();
                
                await interaction.reply({ embeds: [removeRoleEmbed], ephemeral: true });
                break;

            case 'list-roles':
                // Załaduj aktualną konfigurację
                delete require.cache[require.resolve('../../config.js')];
                const listRolesConfig = require('../../config.js');
                
                if (!listRolesConfig.levelRoles || Object.keys(listRolesConfig.levelRoles).length === 0) {
                    return interaction.reply({
                        content: '📋 Brak skonfigurowanych ról poziomów.\nUżyj `/level-admin add-role` aby dodać pierwszą rolę.',
                        ephemeral: true
                    });
                }
                
                const rolesList = Object.entries(listRolesConfig.levelRoles)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([level, roleId]) => {
                        const role = interaction.guild.roles.cache.get(roleId);
                        const roleName = role ? role.name : 'Nieznana rola';
                        return `**Poziom ${level}:** ${role || roleName}`;
                    })
                    .join('\n');
                
                const listRolesEmbed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('🎭 Role poziomów')
                    .setDescription(rolesList)
                    .setFooter({ text: `Łącznie ról: ${Object.keys(listRolesConfig.levelRoles).length}` })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [listRolesEmbed], ephemeral: true });
                break;

            case 'sync-roles':
                await interaction.deferReply({ ephemeral: true });
                
                try {
                    // Załaduj konfigurację
                    delete require.cache[require.resolve('../../config.js')];
                    const syncConfig = require('../../config.js');
                    
                    if (!syncConfig.levelRoles || Object.keys(syncConfig.levelRoles).length === 0) {
                        return interaction.editReply({
                            content: '❌ Brak skonfigurowanych ról poziomów do synchronizacji.'
                        });
                    }
                    
                    const allUsers = await levelSystem.getLeaderboard(1000);
                    let syncedCount = 0;
                    let errorCount = 0;
                    
                    for (const user of allUsers) {
                        try {
                            await levelSystem.checkLevelRoles(
                                user.userId, 
                                interaction.guild.id, 
                                0, 
                                user.level, 
                                interaction.client
                            );
                            syncedCount++;
                        } catch (error) {
                            console.error(`Error syncing roles for user ${user.userId}:`, error);
                            errorCount++;
                        }
                    }
                    
                    const syncEmbed = new EmbedBuilder()
                        .setColor(0x00FF00)
                        .setTitle('🔄 Synchronizacja ról zakończona')
                        .addFields(
                            { name: '✅ Zsynchronizowane', value: syncedCount.toString(), inline: true },
                            { name: '❌ Błędy', value: errorCount.toString(), inline: true },
                            { name: '👥 Łącznie', value: allUsers.length.toString(), inline: true }
                        )
                        .setTimestamp();
                    
                    await interaction.editReply({ embeds: [syncEmbed] });
                } catch (error) {
                    console.error('Error during role sync:', error);
                    await interaction.editReply({
                        content: '❌ Wystąpił błąd podczas synchronizacji ról.'
                    });
                }
                break;
        }
    }
};

module.exports = slash;
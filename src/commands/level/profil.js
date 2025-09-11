const {
    SlashCommandBuilder,
    EmbedBuilder,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const { levelSystem } = require('../../utils/levelSystem');

const slash = {
    data: new SlashCommandBuilder()
        .setName('profil')
        .setDescription('Wyświetla profil użytkownika')
        .addUserOption(option =>
            option
                .setName('użytkownik')
                .setDescription('Użytkownik, którego profil chcesz zobaczyć')
                .setRequired(false)
        ),
    cooldown: 5000,
    run: async (client, interaction) => {
        const targetUser = interaction.options.getUser('użytkownik') || interaction.user;
        const member = interaction.guild.members.cache.get(targetUser.id);
        
        // Nie pozwalaj na sprawdzanie profili botów
        if (targetUser.bot) {
            return interaction.reply({
                content: '❌ Nie możesz sprawdzić profilu bota!',
                ephemeral: true
            });
        }

        const userStats = await levelSystem.getUserLevel(targetUser.id);
        const progressBar = levelSystem.createProgressBar(userStats.currentXp, userStats.requiredXp, 20);
        
        // Pobierz ranking użytkownika
        const leaderboard = await levelSystem.getLeaderboard(100);
        const userRank = leaderboard.findIndex(user => user.userId === targetUser.id) + 1;
        
        const components = [
            new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## 👤 Profil: ${targetUser.displayName}`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                        .setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**📊 Poziom:** ${userStats.level}\n` +
                        `**⭐ XP:** ${userStats.currentXp}/${userStats.requiredXp} (${userStats.xp} łącznie)\n` +
                        `**💬 Wiadomości:** ${userStats.messages}\n` +
                        `**🏆 Ranking:** #${userRank || 'Brak'}`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                        .setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `**Postęp do następnego poziomu:**\n` +
                        `\`${progressBar}\` ${Math.round(userStats.progress)}%`
                    )
                )
                .setAccentColor(member?.displayColor || 0x5865F2)
        ];

        await interaction.reply({
            components: components,
            flags: MessageFlags.IsComponentsV2,
            ephemeral: false
        });
    }
};

module.exports = slash;
const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    MessageFlags
} = require('discord.js');
const { levelSystem } = require('../../utils/levelSystem');

const slash = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Wyświetla ranking użytkowników serwera')
        .addIntegerOption(option =>
            option
                .setName('strona')
                .setDescription('Numer strony do wyświetlenia')
                .setRequired(false)
                .setMinValue(1)
        ),
    cooldown: 10000,
    run: async (client, interaction) => {
        const page = interaction.options.getInteger('strona') || 1;
        const usersPerPage = 10;
        
        const allUsers = await levelSystem.getLeaderboard(1000);
        const totalPages = Math.ceil(allUsers.length / usersPerPage);
        
        if (page > totalPages) {
            return interaction.reply({
                content: `❌ Strona ${page} nie istnieje! Maksymalna strona: ${totalPages}`,
                ephemeral: true
            });
        }

        const startIndex = (page - 1) * usersPerPage;
        const endIndex = startIndex + usersPerPage;
        const pageUsers = allUsers.slice(startIndex, endIndex);

        let leaderboardText = '';
        for (let i = 0; i < pageUsers.length; i++) {
            const user = pageUsers[i];
            const rank = startIndex + i + 1;
            
            try {
                const discordUser = await client.users.fetch(user.userId);
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `**${rank}.**`;
                
                leaderboardText += `${medal} ${discordUser.displayName}\n`;
                leaderboardText += `└ Poziom: **${user.level}** • XP: **${user.xp}** • Wiadomości: **${user.messages}**\n\n`;
            } catch (error) {
                leaderboardText += `**${rank}.** *Nieznany użytkownik*\n`;
                leaderboardText += `└ Poziom: **${user.level}** • XP: **${user.xp}** • Wiadomości: **${user.messages}**\n\n`;
            }
        }

        const components = [
            new ContainerBuilder()
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `## 🏆 Ranking serwera - Strona ${page}/${totalPages}`
                    )
                )
                .addSeparatorComponents(
                    new SeparatorBuilder()
                        .setSpacing(SeparatorSpacingSize.Small)
                        .setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(leaderboardText.trim() || 'Brak użytkowników na tej stronie.')
                )
                .setAccentColor(0xFFD700)
        ];

        const buttons = [];
        
        if (page > 1) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`leaderboard_${page - 1}`)
                    .setLabel('⬅️ Poprzednia')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        if (page < totalPages) {
            buttons.push(
                new ButtonBuilder()
                    .setCustomId(`leaderboard_${page + 1}`)
                    .setLabel('Następna ➡️')
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        const response = {
            components: components,
            flags: MessageFlags.IsComponentsV2
        };

        // Dodaj przyciski jeśli istnieją
        if (buttons.length > 0) {
            response.components.push(new ActionRowBuilder().addComponents(buttons));
        }

        await interaction.reply(response);
    }
};

module.exports = slash;
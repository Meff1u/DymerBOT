const { Events } = require("discord.js");

module.exports = {
    name: Events.InteractionCreate,
    execute: async (interaction) => {
        let client = interaction.client;

        if (interaction.user.bot) return;

        if (interaction.isChatInputCommand()) {
            try {
                const cmd = client.commands.get(interaction.commandName);

                if (!cmd) return interaction.reply({ content: "Nie znaleziono takiej komendy!", ephemeral: true });
                if (cmd.admin && !interaction.member.permissions.has("ADMINISTRATOR")) {
                    return interaction.reply({ content: "Nie masz uprawnień do użycia tej komendy!", ephemeral: true });
                }

                if (cmd.cooldown) {
                    if (client.cooldown.has(`${cmd.data.name}.${interaction.user.id}`)) {
                        const now = interaction.createdTimestamp;
                        const timeleft =
                            client.cooldown.get(`${cmd.data.name}.${interaction.user.id}`) - now;
                        const finaltime = Math.floor(new Date(now + timeleft).getTime() / 1000);
                        return interaction.reply({
                            content: `Ponowne użycie tej komendy będzie dostępne <t:${finaltime}:R>`,
                            ephemeral: true,
                        });
                    }

                    cmd.run(client, interaction);
                    client.cooldown.set(
                        `${cmd.data.name}.${interaction.user.id}`,
                        Date.now() + cmd.cooldown
                    );
                    setTimeout(() => {
                        client.cooldown.delete(`${cmd.data.name}.${interaction.user.id}`);
                    }, cmd.cooldown + 1000);
                } else {
                    cmd.run(client, interaction);
                }
            } catch (e) {
                console.error(e);
                const errorId = client.genErrorId();
                client.sendTrackback(e, errorId, client.trackBackChannel);
                return interaction.reply({
                    content: `Wystąpił błąd podczas wykonywania tej komendy. Spróbuj ponownie później lub skontaktuj się z administratorem.\n-# ID błędu: \`${errorId}\``,
                    ephemeral: true,
                });
            }
        }

        // Obsługa przycisków leaderboard
        if (interaction.isButton() && interaction.customId.startsWith('leaderboard_')) {
            const page = parseInt(interaction.customId.split('_')[1]);
            
            try {
                const { levelSystem } = require('../utils/levelSystem');
                const {
                    ContainerBuilder,
                    TextDisplayBuilder,
                    SeparatorBuilder,
                    SeparatorSpacingSize,
                    ActionRowBuilder,
                    ButtonBuilder,
                    ButtonStyle,
                    MessageFlags
                } = require('discord.js');

                const usersPerPage = 10;
                const allUsers = await levelSystem.getLeaderboard(1000);
                const totalPages = Math.ceil(allUsers.length / usersPerPage);
                
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

                if (buttons.length > 0) {
                    response.components.push(new ActionRowBuilder().addComponents(buttons));
                }

                await interaction.update(response);
            } catch (error) {
                console.error('Błąd w obsłudze przycisków leaderboard:', error);
                await interaction.reply({
                    content: 'Wystąpił błąd podczas ładowania strony rankingu.',
                    ephemeral: true
                });
            }
        }
    },
};

const {
    SlashCommandBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    ContainerBuilder,
    MessageFlags,
} = require("discord.js");

const slash = {
    data: new SlashCommandBuilder().setName("ping").setDescription("Ping bota"),
    cooldown: 5000,
    run: async (client, interaction) => {
        const ping = await interaction.reply({
            components: [new TextDisplayBuilder().setContent("Pingowanie...")],
            fetchReply: true,
            flags: MessageFlags.IsComponentsV2,
        });

        const components = [
            new ContainerBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent("Pong! 🏓"))
                .addSeparatorComponents(
                    new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
                )
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `WS: \`${client.ws.ping}ms\`\nREST: \`${
                            ping.createdTimestamp - interaction.createdTimestamp
                        }ms\``
                    )
                )
                .setAccentColor(3066993),
        ];

        await interaction.editReply({ components: components, flags: MessageFlags.IsComponentsV2 });
    },
};

module.exports = slash;

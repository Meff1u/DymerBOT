const {
    SlashCommandBuilder,
    EmbedBuilder,
    AttachmentBuilder,
    ContainerBuilder,
    MediaGalleryBuilder,
    MediaGalleryItemBuilder,
    SeparatorBuilder,
    SeparatorSpacingSize,
    SectionBuilder,
    ButtonBuilder,
    ButtonStyle,
    TextDisplayBuilder,
    MessageFlags,
} = require("discord.js");
const fs = require("fs").promises;
const path = require("path");

const slash = {
    data: new SlashCommandBuilder()
        .setName("rules")
        .setDescription("Zarządzanie regulaminem serwera")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Dodawanie nowego punktu do regulaminu")
                .addStringOption((option) =>
                    option
                        .setName("content")
                        .setDescription("Treść punktu regulaminu")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("edit")
                .setDescription("Edycja istniejącego punktu regulaminu")
                .addIntegerOption((option) =>
                    option
                        .setName("index")
                        .setDescription("Numer punktu do edycji (1, 2, 3...)")
                        .setRequired(true)
                        .setMinValue(1)
                )
                .addStringOption((option) =>
                    option
                        .setName("content")
                        .setDescription("Nowa treść punktu regulaminu")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Usuwanie punktu z regulaminu")
                .addIntegerOption((option) =>
                    option
                        .setName("index")
                        .setDescription("Numer punktu do usunięcia (1, 2, 3...)")
                        .setRequired(true)
                        .setMinValue(1)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand.setName("list").setDescription("Wyświetlanie wszystkich punktów regulaminu")
        )
        .addSubcommand((subcommand) =>
            subcommand.setName("update").setDescription("Aktualizacja treści regulaminu")
        ),
    admin: true,
    run: async (client, interaction) => {
        const subcommand = interaction.options.getSubcommand();
        const dataPath = path.join(__dirname, "..", "..", "data.json");

        try {
            delete require.cache[require.resolve("../../data.json")];
            const data = require("../../data.json");

            switch (subcommand) {
                case "add":
                    const newRule = interaction.options.getString("content");
                    data.rules.push(newRule);

                    await saveData(dataPath, data);

                    const addEmbed = new EmbedBuilder()
                        .setColor(0x00ff00)
                        .setTitle("✅ Punkt dodany")
                        .setDescription(`Dodano punkt ${data.rules.length}: ${newRule}`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [addEmbed], ephemeral: true });
                    break;

                case "edit":
                    const editIndex = interaction.options.getInteger("index") - 1;
                    const editContent = interaction.options.getString("content");

                    if (editIndex < 0 || editIndex >= data.rules.length) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle("❌ Błąd")
                            .setDescription(
                                `Punkt o numerze ${editIndex + 1} nie istnieje. Regulamin ma ${
                                    data.rules.length
                                } punktów.`
                            )
                            .setTimestamp();

                        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                        return;
                    }

                    const oldContent = data.rules[editIndex];
                    data.rules[editIndex] = editContent;

                    await saveData(dataPath, data);

                    const editEmbed = new EmbedBuilder()
                        .setColor(0xffff00)
                        .setTitle("✏️ Punkt zedytowany")
                        .addFields(
                            { name: "Punkt", value: `${editIndex + 1}`, inline: true },
                            { name: "Stara treść", value: oldContent, inline: false },
                            { name: "Nowa treść", value: editContent, inline: false }
                        )
                        .setTimestamp();

                    await interaction.reply({ embeds: [editEmbed], ephemeral: true });
                    break;

                case "remove":
                    const removeIndex = interaction.options.getInteger("index") - 1;

                    if (removeIndex < 0 || removeIndex >= data.rules.length) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor(0xff0000)
                            .setTitle("❌ Błąd")
                            .setDescription(
                                `Punkt o numerze ${removeIndex + 1} nie istnieje. Regulamin ma ${
                                    data.rules.length
                                } punktów.`
                            )
                            .setTimestamp();

                        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                        return;
                    }

                    const removedRule = data.rules.splice(removeIndex, 1)[0];

                    await saveData(dataPath, data);

                    const removeEmbed = new EmbedBuilder()
                        .setColor(0xff0000)
                        .setTitle("🗑️ Punkt usunięty")
                        .setDescription(`Usunięto punkt ${removeIndex + 1}: ${removedRule}`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [removeEmbed], ephemeral: true });
                    break;

                case "list":
                    if (data.rules.length === 0) {
                        const emptyEmbed = new EmbedBuilder()
                            .setColor(0x808080)
                            .setTitle("📋 Regulamin")
                            .setDescription(
                                "Regulamin jest pusty. Dodaj pierwszy punkt używając `/rules add`."
                            )
                            .setTimestamp();

                        await interaction.reply({ embeds: [emptyEmbed], ephemeral: true });
                        return;
                    }

                    const rulesList = data.rules
                        .map((rule, index) => `**${index + 1}.** ${rule}`)
                        .join("\n\n");

                    const listEmbed = new EmbedBuilder()
                        .setColor(0x0099ff)
                        .setTitle("📋 Regulamin serwera")
                        .setDescription(rulesList)
                        .setFooter({ text: `Łącznie punktów: ${data.rules.length}` })
                        .setTimestamp();

                    await interaction.reply({ embeds: [listEmbed], ephemeral: true });
                    break;
                case "update":
                    const banner = new AttachmentBuilder("./src/assets/regulamin.png");

                    const components = [
                        new ContainerBuilder()
                            .addMediaGalleryComponents(
                                new MediaGalleryBuilder().addItems(
                                    new MediaGalleryItemBuilder().setURL(
                                        "attachment://regulamin.png"
                                    )
                                )
                            )
                            .addSeparatorComponents(
                                new SeparatorBuilder()
                                    .setSpacing(SeparatorSpacingSize.Small)
                                    .setDivider(true)
                            )
                            .addSectionComponents(
                                new SectionBuilder()
                                    .setButtonAccessory(
                                        new ButtonBuilder()
                                            .setStyle(ButtonStyle.Link)
                                            .setLabel("Terms of Service")
                                            .setURL("https://discord.com/terms")
                                    )
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            "> Przestrzegaj **Warunków korzystania z usługi Discorda**:"
                                        )
                                    )
                            )
                            .addSectionComponents(
                                new SectionBuilder()
                                    .setButtonAccessory(
                                        new ButtonBuilder()
                                            .setStyle(ButtonStyle.Link)
                                            .setLabel("Guidelines")
                                            .setURL("https://discord.com/guidelines")
                                    )
                                    .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                            "> Przestrzegaj **Wytycznych dla społeczności Discord**:"
                                        )
                                    )
                            )
                            .addSeparatorComponents(
                                new SeparatorBuilder()
                                    .setSpacing(SeparatorSpacingSize.Small)
                                    .setDivider(true)
                            )
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    data.rules.length > 0
                                        ? data.rules
                                              .map((rule, index) => `**${index + 1}.** ${rule}`)
                                              .join("\n\n")
                                        : "Brak zasad w regulaminie."
                                )
                            ),
                        new TextDisplayBuilder().setContent(
                            `-# Ostatnia aktualizacja: <t:${Math.floor(Date.now() / 1000)}:F>`
                        ),
                    ];

                    const rulesMessage = await client.channels.cache.get("1415717369460031488").messages.fetch("1415760422967185509");
                    await rulesMessage.edit({
                        components: components,
                        files: [banner],
                        flags: MessageFlags.IsComponentsV2,
                    });
                    await interaction.reply({ content: "Zaktualizowano regulamin.", ephemeral: true });
                    break;
            }
        } catch (error) {
            console.error("Błąd w komendzie rules:", error);

            const errorEmbed = new EmbedBuilder()
                .setColor(0xff0000)
                .setTitle("❌ Wystąpił błąd")
                .setDescription("Nie udało się wykonać operacji. Sprawdź logi konsoli.")
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};

async function saveData(dataPath, data) {
    await fs.writeFile(dataPath, JSON.stringify(data, null, 4), "utf8");
}

module.exports = slash;

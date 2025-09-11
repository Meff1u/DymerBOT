const { EmbedBuilder } = require("discord.js");
const moment = require("moment");
const config = require('../config.js');

module.exports = {
    execute: async (client) => {
        // Custom logging function with timestamp
        client.log = function (message) {
            console.log(`[${moment().format("DD-MM-YYYY HH:mm:ss")}] ${message}`);
        };

        // Trackback function to send error details to a specific channel
        client.sendTrackback = function (error, errorId, channel) {
            return channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`${error.message.slice(0, 256)}`)
                        .setColor("#ff0000")
                        .setFooter({ text: `Error ID: ${errorId}` })
                        .setDescription(`\`\`\`${error.stack.slice(0, 4096 - 6)}\`\`\``),
                ],
            });
        };

        // Function to generate a unique error ID
        client.genErrorId = function () {
            return Math.random().toString(36).substring(2, 15).toUpperCase();
        }

        // Function to register slash commands with Discord API
        client.registerSlashCommands = async function (commands) {
            const { REST, Routes } = require('discord.js');
            const rest = new REST().setToken(config.token);

            (async () => {
                try {
                    client.log('Started refreshing application (/) commands.');
                    const data = await rest.put(
                        Routes.applicationGuildCommands(client.user.id, '1415708739738013819'),
                        { body: client.commandDatas },
                    );

                    client.log(`Successfully reloaded ${data.length} application (/) commands.`);
                } catch (error) {
                    console.error(error);
                    client.sendTrackback(error, client.genErrorId(), client.trackBackChannel);
                }
            })();
        }
    },
};

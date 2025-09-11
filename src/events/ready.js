const { Events, ActivityType, MediaGalleryBuilder, MediaGalleryItemBuilder, AttachmentBuilder, MessageFlags, ContainerBuilder, TextDisplayBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute: async (client) => {
        client.log(`${client.user.tag} is ready!`);

        // Set the trackBackChannel property on the client
        client.trackBackChannel = client.channels.cache.get("1415737510704840755");

        // Register slash commands
        client.registerSlashCommands();

        // Update server stats in voice channels name
        const usersChannel = client.channels.cache.get("1415713097099776152");
        const bansChannel = client.channels.cache.get("1415727604165644412");
        const talkingChannel = client.channels.cache.get("1415727629159370762");

        setInterval(async () => {
            try {
                const guild = client.guilds.cache.get("1415708739738013819");
                await guild.members.fetch();
                const bans = await guild.bans.fetch();

                const realUsers = guild.members.cache.filter(member => !member.user.bot).size;
                
                let voiceUsers = 0;
                guild.channels.cache.forEach(channel => {
                    if (channel.type === 2) {
                        voiceUsers += channel.members.size;
                    }
                });
                
                if (usersChannel) {
                    await usersChannel.setName(`👥 Użytkownicy: ${realUsers}`);
                    client.user.setPresence({
                        activities: [{ name: `${realUsers} users`, type: ActivityType.Watching }],
                        status: 'idle',
                    });
                }
                
                if (bansChannel) {
                    await bansChannel.setName(`🔨 Bany: ${bans.size}`);
                }
                
                if (talkingChannel) {
                    await talkingChannel.setName(`🎤 Rozmawia: ${voiceUsers}`);
                }
            } catch (error) {
                console.error('Błąd podczas aktualizacji statystyk:', error);
            }
        }, 180000);
    },
};

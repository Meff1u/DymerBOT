const { Events, ActivityType } = require("discord.js");

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
        const followersChannel = client.channels.cache.get("1417232407018602587");

        setInterval(async () => {
            try {
                // Get members count
                const guild = client.guilds.cache.get("1415708739738013819");
                await guild.members.fetch();
                const realUsers = guild.members.cache.filter(member => !member.user.bot).size;
                
                // Get bans count
                const bans = await guild.bans.fetch();

                // Get voice channel users count
                let voiceUsers = 0;
                guild.channels.cache.forEach(channel => {
                    if (channel.type === 2) {
                        voiceUsers += channel.members.size;
                    }
                });

                // Get followers count
                const followersCount = await getKickFollowers("dymerrr");
                
                // Update channel names
                if (usersChannel) {
                    await usersChannel.setName(`👥Użytkownicy: ${realUsers}`);
                    client.user.setPresence({
                        activities: [{ name: `${realUsers} użytkowników`, type: ActivityType.Watching }],
                        status: 'idle',
                    });
                }
                
                if (bansChannel) {
                    await bansChannel.setName(`🔨Bany: ${bans.size}`);
                }
                
                if (talkingChannel) {
                    await talkingChannel.setName(`🎤Rozmawia: ${voiceUsers}`);
                }

                if (followersChannel && followersCount !== null) {
                    await followersChannel.setName(`🔔Obserwuje: ${followersCount}`);
                }
            } catch (error) {
                console.error('Error updating statistics:', error);
            }
        }, 180000);
    },
};

async function getKickFollowers(channel) {
    const url = `https://kick.com/api/v2/channels/${channel}`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error(`Failed to fetch followers count: ${res.statusText}`);
            return null;
        }
        const data = await res.json();
        return data.followers_count;
    } catch (error) {
        console.error('Error fetching followers count:', error);
        return null;
    }
}
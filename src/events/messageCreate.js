const { Events } = require('discord.js');
const { levelSystem } = require('../utils/levelSystem');

module.exports = {
    name: Events.MessageCreate,
    execute: async (message) => {
        // Ignoruj boty i wiadomości systemowe
        if (message.author.bot || message.system) return;
        
        // Ignoruj wiadomości prywatne
        if (!message.guild) return;

        try {
            const result = await levelSystem.addXp(message.author.id, message.guild.id);
            
            // Jeśli użytkownik awansował na poziom (tylko gdy dostał XP)
            if (result && result.leveledUp && !result.onCooldown) {
                // Sprawdź i zarządzaj rolami poziomów
                const roleChanges = await levelSystem.checkLevelRoles(
                    message.author.id, 
                    message.guild.id, 
                    result.oldLevel, 
                    result.newLevel, 
                    message.client
                );

                let levelUpMessage = `🎉 Gratulacje ${message.author}! Awansowałeś na **poziom ${result.newLevel}**!`;
                
                // Dodaj informację o nowych rolach
                if (roleChanges.added.length > 0) {
                    const roleNames = roleChanges.added.map(roleId => {
                        const role = message.guild.roles.cache.get(roleId);
                        return role ? role.name : 'Nieznana rola';
                    }).join(', ');
                    levelUpMessage += `\n🎯 **Otrzymano role:** ${roleNames}`;
                }
                
                // Wyślij wiadomość o awansie (z auto-usunięciem po 15 sekundach)
                const levelUpMsg = await message.channel.send(levelUpMessage);
                setTimeout(() => {
                    levelUpMsg.delete().catch(() => {});
                }, 15000);
            }
        } catch (error) {
            console.error('Błąd w systemie leveli:', error);
        }
    }
};
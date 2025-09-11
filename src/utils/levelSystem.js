const fs = require('fs').promises;
const path = require('path');

class LevelSystem {
    constructor() {
        this.dataDir = path.join(__dirname, '..', 'data');
        this.users = new Map();
        this.cooldowns = new Map();
        this.ensureDataDir();
    }

    async ensureDataDir() {
        try {
            await fs.access(this.dataDir);
        } catch (error) {
            await fs.mkdir(this.dataDir, { recursive: true });
        }
    }

    getUserFilePath(userId) {
        return path.join(this.dataDir, `${userId}.json`);
    }

    async loadUser(userId) {
        if (this.users.has(userId)) {
            return this.users.get(userId);
        }

        try {
            const filePath = this.getUserFilePath(userId);
            const data = await fs.readFile(filePath, 'utf8');
            const userData = JSON.parse(data);
            this.users.set(userId, userData);
            return userData;
        } catch (error) {
            const newUser = {
                level: 1,
                xp: 0,
                messages: 0,
                lastXpGain: 0
            };
            this.users.set(userId, newUser);
            await this.saveUser(userId, newUser);
            return newUser;
        }
    }

    async saveUser(userId, userData) {
        try {
            const filePath = this.getUserFilePath(userId);
            await fs.writeFile(filePath, JSON.stringify(userData, null, 2));
            this.users.set(userId, userData);
        } catch (error) {
            console.error(`Error saving user data for ${userId}:`, error);
        }
    }

    async getAllUsers() {
        try {
            const files = await fs.readdir(this.dataDir);
            const userFiles = files.filter(file => file.endsWith('.json') && file !== 'users.json');
            
            const allUsers = [];
            for (const file of userFiles) {
                const userId = file.replace('.json', '');
                try {
                    const userData = await this.loadUser(userId);
                    allUsers.push({
                        userId,
                        ...userData
                    });
                } catch (error) {
                    console.error(`Error loading user ${userId}:`, error);
                }
            }
            
            return allUsers;
        } catch (error) {
            console.error('Error getting all users:', error);
            return [];
        }
    }

    async getUser(userId) {
        return await this.loadUser(userId);
    }

    calculateLevelRequirement(level) {
        return 100 * Math.pow(level, 2);
    }

    calculateLevel(totalXp) {
        let level = 1;
        let xpRequired = this.calculateLevelRequirement(level);
        
        while (totalXp >= xpRequired) {
            totalXp -= xpRequired;
            level++;
            xpRequired = this.calculateLevelRequirement(level);
        }
        
        return {
            level: level,
            currentXp: totalXp,
            requiredXp: xpRequired
        };
    }

    async addXp(userId, guildId) {
        const user = await this.getUser(userId);
        
        user.messages += 1;
        
        const cooldownKey = `${userId}-${guildId}`;
        const now = Date.now();
        
        let xpGained = 0;
        let leveledUp = false;
        let oldLevel = user.level;
        let newLevel = user.level;
        
        if (this.cooldowns.has(cooldownKey)) {
            const lastGain = this.cooldowns.get(cooldownKey);
            if (now - lastGain < 60000) {
                await this.saveUser(userId, user);
                
                return {
                    xpGained: 0,
                    leveledUp: false,
                    oldLevel: oldLevel,
                    newLevel: newLevel,
                    currentXp: this.calculateLevel(user.xp).currentXp,
                    requiredXp: this.calculateLevel(user.xp).requiredXp,
                    totalXp: user.xp,
                    messages: user.messages,
                    onCooldown: true
                };
            }
        }

        xpGained = Math.floor(Math.random() * 3) + 1;
        user.xp += xpGained;
        user.lastXpGain = now;
        
        this.cooldowns.set(cooldownKey, now);
        
        const levelData = this.calculateLevel(user.xp);
        newLevel = levelData.level;
        leveledUp = newLevel > oldLevel;
        
        user.level = newLevel;
        
        await this.saveUser(userId, user);
        
        return {
            xpGained: xpGained,
            leveledUp: leveledUp,
            oldLevel: oldLevel,
            newLevel: newLevel,
            currentXp: levelData.currentXp,
            requiredXp: levelData.requiredXp,
            totalXp: user.xp,
            messages: user.messages,
            onCooldown: false
        };
    }

    async getUserLevel(userId) {
        const user = await this.getUser(userId);
        const levelData = this.calculateLevel(user.xp);
        
        return {
            level: user.level,
            xp: user.xp,
            currentXp: levelData.currentXp,
            requiredXp: levelData.requiredXp,
            messages: user.messages,
            progress: (levelData.currentXp / levelData.requiredXp) * 100
        };
    }

    async getLeaderboard(limit = 10) {
        const allUsers = await this.getAllUsers();
        
        const sortedUsers = allUsers
            .map(userData => ({
                userId: userData.userId,
                level: userData.level,
                xp: userData.xp,
                messages: userData.messages
            }))
            .sort((a, b) => {
                if (b.level !== a.level) {
                    return b.level - a.level;
                }
                return b.xp - a.xp;
            })
            .slice(0, limit);

        return sortedUsers;
    }

    createProgressBar(current, max, length = 20) {
        const filled = Math.floor((current / max) * length);
        const empty = length - filled;
        
        const fillChar = '█';
        const emptyChar = '░';
        
        return fillChar.repeat(filled) + emptyChar.repeat(empty);
    }

    async checkLevelRoles(userId, guildId, oldLevel, newLevel, client) {
        try {
            const config = require('../config.js');
            const guild = client.guilds.cache.get(guildId);
            const member = guild.members.cache.get(userId);
            
            if (!member || !config.levelRoles) return;

            const levelRoles = config.levelRoles;
            const rolesToAdd = [];
            const rolesToRemove = [];

            for (const [level, roleId] of Object.entries(levelRoles)) {
                const levelNum = parseInt(level);
                const hasRole = member.roles.cache.has(roleId);

                if (newLevel >= levelNum && !hasRole) {
                    rolesToAdd.push(roleId);
                } else if (newLevel < levelNum && hasRole) {
                    rolesToRemove.push(roleId);
                }
            }

            if (rolesToAdd.length > 0) {
                await member.roles.add(rolesToAdd);
            }
            if (rolesToRemove.length > 0) {
                await member.roles.remove(rolesToRemove);
            }

            return { added: rolesToAdd, removed: rolesToRemove };
        } catch (error) {
            console.error('Error managing level roles:', error);
            return { added: [], removed: [] };
        }
    }
}

const levelSystemInstance = new LevelSystem();

const moduleExports = {
    execute: async (client) => {
        client.levelSystem = levelSystemInstance;
        console.log('Level system loaded successfully!');
    },
    levelSystem: levelSystemInstance
};

module.exports = moduleExports;
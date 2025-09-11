const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { readdirSync } = require('fs');
const config = require('./src/config.js');

const client = new Client({
    intents: Object.values(GatewayIntentBits),
    partials: Object.values(Partials),
    shards: 'auto'
});

client.mainColor = '#5865F2';
client.package = require('./package.json');

async function loadUtils() {
    const utilFiles = readdirSync('./src/utils');
    const utilPromises = utilFiles.map((file) => require(`./src/utils/${file}`).execute(client));
    return Promise.all(utilPromises);
}

async function init() {
    try {
        await loadUtils();
        await client.login(config.token);
    } catch (error) {
        console.error('Error during initialization:', error);
    }
}

init();
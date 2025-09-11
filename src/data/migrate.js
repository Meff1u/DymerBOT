const fs = require('fs').promises;
const path = require('path');

/**
 * Skrypt migracji - konwertuje stary plik users.json na osobne pliki użytkowników
 */
async function migrateData() {
    const oldDataPath = path.join(__dirname, 'users.json');
    const dataDir = path.join(__dirname);
    
    try {
        // Sprawdź czy istnieje stary plik
        const oldData = await fs.readFile(oldDataPath, 'utf8');
        const usersData = JSON.parse(oldData);
        
        console.log('Znaleziono stary plik danych. Rozpoczynam migrację...');
        
        let migratedCount = 0;
        for (const [userId, userData] of Object.entries(usersData)) {
            const userFilePath = path.join(dataDir, `${userId}.json`);
            await fs.writeFile(userFilePath, JSON.stringify(userData, null, 2));
            migratedCount++;
        }
        
        console.log(`Zmigrowano ${migratedCount} użytkowników.`);
        
        // Opcjonalnie: usuń stary plik po migracji
        // await fs.unlink(oldDataPath);
        // console.log('Usunięto stary plik danych.');
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('Brak starego pliku danych do migracji.');
        } else {
            console.error('Błąd podczas migracji:', error);
        }
    }
}

// Uruchom tylko jeśli wywołano bezpośrednio
if (require.main === module) {
    migrateData();
}

module.exports = { migrateData };
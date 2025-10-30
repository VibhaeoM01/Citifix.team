const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, 'uploads');

console.log('Checking uploads directory...');
console.log('Uploads directory path:', uploadsDir);

try {
    // Check if directory exists
    if (fs.existsSync(uploadsDir)) {
        console.log('✓ Uploads directory exists');
        
        // Check if it's a directory
        const stats = fs.statSync(uploadsDir);
        if (stats.isDirectory()) {
            console.log('✓ Uploads path is a directory');
            
            // List files in directory
            const files = fs.readdirSync(uploadsDir);
            console.log(`\nFiles in uploads directory (${files.length} total):`);
            files.forEach(file => {
                const filePath = path.join(uploadsDir, file);
                const fileStats = fs.statSync(filePath);
                console.log(`- ${file} (${fileStats.size} bytes)`);
            });
        } else {
            console.log('✗ Uploads path exists but is not a directory');
        }
    } else {
        console.log('✗ Uploads directory does not exist');
    }
} catch (error) {
    console.error('Error checking uploads directory:', error);
}
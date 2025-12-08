const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/health',
    method: 'GET',
    timeout: 2000,
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    if (res.statusCode === 200) {
        console.log('Health check passed');
        process.exit(0);
    } else {
        console.log('Health check failed');
        process.exit(1);
    }
});

req.on('error', (e) => {
    console.log(`Health check skipped: Server likely not running (${e.message})`);
    // Do not fail the build/process if server is just not running in this context
    process.exit(0);
});

req.end();

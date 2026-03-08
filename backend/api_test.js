const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      hostname: 'localhost', port: 5000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost', port: 5000, path,
      headers: { Authorization: 'Bearer ' + token }
    };
    const req = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  try {
    // Try different passwords
    const passwords = ['password', '123456', 'student', '5454317', 'Password@123', '1234'];
    let token = null;
    for (const pwd of passwords) {
      const login = await post('/api/auth/login', { email: '5454317@mitacsc.edu.in', password: pwd });
      process.stdout.write('Login with ' + pwd + ': ' + login.status + '\n');
      if (login.status === 200) {
        token = JSON.parse(login.body).token;
        process.stdout.write('Got token with password: ' + pwd + '\n');
        break;
      }
    }

    if (!token) { process.stdout.write('Could not login\n'); process.exit(0); }

    // Test assignments list
    const list = await get('/api/student/assignments', token);
    process.stdout.write('Assignments list: ' + list.status + ' => ' + list.body.substring(0, 800) + '\n');

    // Test assignment detail
    const detail = await get('/api/student/assignments/5', token);
    process.stdout.write('Assignment 5 detail: ' + detail.status + ' => ' + detail.body.substring(0, 500) + '\n');

  } catch(e) {
    process.stdout.write('Error: ' + e.message + '\n');
  }
  process.exit(0);
}

main();

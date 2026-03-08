const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const jwt = require('jsonwebtoken');

async function testApi() {
  try {
    const token = jwt.sign({ id: 2, email: 'nm@mit.edu.in', role: 'teacher' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    const res = await fetch('http://localhost:5000/api/teacher/dashboard-stats', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    fs.writeFileSync(path.join(__dirname, '../out.json'), JSON.stringify(data, null, 2));
    process.exit(0);
  } catch(e) {
    fs.writeFileSync(path.join(__dirname, '../out.json'), JSON.stringify({ error: e.message, stack: e.stack }, null, 2));
    process.exit(0);
  }
}
testApi();

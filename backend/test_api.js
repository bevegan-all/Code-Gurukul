const api = require('axios');

async function testApi() {
  try {
    const res = await api.get('http://localhost:5000/api/student/quizzes', {
      headers: {
        Authorization: `Bearer ` + require('fs').readFileSync('test_token.txt', 'utf8').trim()
      }
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch(e) { console.error(e.message); }
}

testApi();

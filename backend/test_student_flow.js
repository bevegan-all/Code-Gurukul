const axios = require('axios');
const fs = require('fs');

(async () => {
    try {
        const authRes = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'se33@student.com',
            password: 'password123'
        });
        const token = authRes.data.token;
        fs.writeFileSync('out_flow.txt', "Token: " + token.substring(0, 10) + "\n");

        const res = await axios.get('http://localhost:5000/api/student/quizzes/4', {
            headers: { Authorization: `Bearer ${token}` }
        });
        fs.appendFileSync('out_flow.txt', "Response for ID 4: " + res.data.title + "\n");
        
        const res2 = await axios.get('http://localhost:5000/api/student/quizzes/5', {
            headers: { Authorization: `Bearer ${token}` }
        });
        fs.appendFileSync('out_flow.txt', "Response for ID 5: " + res2.data.title + "\n");
        
        const resAll = await axios.get('http://localhost:5000/api/student/quizzes', {
            headers: { Authorization: `Bearer ${token}` }
        });
        fs.appendFileSync('out_flow.txt', "All assigned quizzes: " + resAll.data.map(q => q.title).join(', ') + "\n");
    } catch(e) {
        fs.writeFileSync('out_flow.txt', "Error: " + (e.response ? JSON.stringify(e.response.data) : e.message) + "\n");
    }
})();

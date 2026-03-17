require('dotenv').config({ path: './backend/.env' });
const { User } = require('./backend/models/postgres');

async function checkUsers() {
  try {
    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'profile_image'],
      raw: true
    });
    console.log(JSON.stringify(users, null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    process.exit();
  }
}
checkUsers();

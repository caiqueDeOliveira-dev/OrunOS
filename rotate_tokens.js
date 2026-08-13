```javascript
const fs = require('fs');
const axios = require('axios');

const tokens = JSON.parse(fs.readFileSync('tokens.json', 'utf8'));

const rotateToken = () => {
  const currentIndex = tokens.currentIndex;
  const nextIndex = (currentIndex + 1) % tokens.tokens.length;
  tokens.currentIndex = nextIndex;
  fs.writeFileSync('tokens.json', JSON.stringify(tokens));
};

const getToken = () => {
  return tokens.tokens[tokens.currentIndex];
};

const sendRequest = async (url) => {
  try {
    const token = getToken();
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response.data;
  } catch (error) {
    if (error.response.status === 401) {
      rotateToken();
      return sendRequest(url);
    } else {
      throw error;
    }
  }
};

module.exports = { sendRequest };
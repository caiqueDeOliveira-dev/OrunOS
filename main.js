```javascript
const { sendRequest } = require('./rotate_tokens');

const url = 'https://example.com/api/endpoint';
sendRequest(url).then((data) => {
  console.log(data);
}).catch((error) => {
  console.error(error);
});
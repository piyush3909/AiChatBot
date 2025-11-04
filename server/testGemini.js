require("dotenv").config();
const aiChat = require("./aiBackend");

(async () => {
  const reply = await aiChat([{ role:"user", parts:[{text:"Hi"}] }]);
  console.log("AI:", reply);
})();

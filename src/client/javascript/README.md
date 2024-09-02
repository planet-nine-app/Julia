# Julia

This is the JavaScript client SDK for the Julia miniservice. 

### Usage

```javascript
import julia from 'julia-js';

const saveKeys = (keys) => { /* handle persisting keys here */ };
const getKeys = () => { /* return keys here. Can be async */ };

const anotherUserUUID = 'some other uuid';
const contents = 'write your message here';

const uuid = await julia.createUser(saveKeys, getKeys, [optionalUser]);

const user = await julia.getUser(uuid);;

const userAgain = await julia.getPrompt(uuid);

const prompt = Object.keys(userAgain.pendingPrompts).pop(); 

const userAThirdTime = await julia.signPrompt(uuid, prompt); // see [MAGIC](https://www.github.com/planet-nine-app/MAGIC) for how spells resolve.

const signedPrompt = // a user's pendingPrompts will include signed and unsigned prompts so you'll need to grab it from there.

const userAFourthTime = await julia.associate(uuid, signedPrompt); 

const userAFifthTime = await julia.deleteKey(uuid, anotherUserUUID);

const success = await julia.postMessage(uuid, anotherUserUUID, contents);

const messages = await julia.getMessages(uuid);

const deleted = await julia.deleteUser(uuid, newHash); // returns true on success
```
